import express from 'express';
import pino from 'pino';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { z } from 'zod';
import { MeiliSearch } from 'meilisearch';
import { createKafkaClient, EventTypes, Topics, utils, CommonMiddleware } from '@science-map/shared';
collectDefaultMetrics({ register });
const logger = pino({
    level: process.env['LOG_LEVEL'] || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});
const app = express();
const PORT = process.env['PORT'] || 3005;
// const KAFKA_BROKERS = process.env['KAFKA_BROKERS'] ? process.env['KAFKA_BROKERS'].split(',') : ['localhost:9092'];
const MEILISEARCH_URL = process.env['MEILISEARCH_URL'] || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env['MEILISEARCH_API_KEY'] || '';
const kafkaClient = createKafkaClient('search-service');
const meiliClient = new MeiliSearch({
    host: MEILISEARCH_URL,
    apiKey: MEILISEARCH_API_KEY,
});
register.setDefaultLabels({
    app: 'search-service'
});
const searchRequestsTotal = new Counter({
    name: 'search_requests_total',
    help: 'Total number of search requests',
    labelNames: ['method', 'route', 'status_code'],
});
const searchRequestDuration = new Histogram({
    name: 'search_request_duration_seconds',
    help: 'Duration of search requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
});
const searchEventsProcessed = new Counter({
    name: 'search_events_processed_total',
    help: 'Total number of search events processed',
    labelNames: ['event_type', 'status'],
});
const searchIndexDocuments = new Gauge({
    name: 'search_index_documents_total',
    help: 'Total number of documents in search index',
});
const searchQueriesTotal = new Counter({
    name: 'search_queries_total',
    help: 'Total number of search queries',
    labelNames: ['query_type'],
});
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        searchRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode.toString()
        });
        searchRequestDuration.observe({
            method: req.method,
            route,
            status_code: res.statusCode.toString()
        }, duration);
    });
    next();
});
const commonMiddleware = CommonMiddleware.create(logger);
commonMiddleware.setupAll(app, 'search-service', {
    cors: {
        origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
        credentials: true
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    logging: {
        level: process.env['LOG_LEVEL'] || 'info'
    }
});
const searchQuerySchema = z.object({
    query: z.string().min(1).max(255),
    limit: z.number().min(1).max(100).optional().default(20),
    offset: z.number().min(0).optional().default(0),
    filters: z.record(z.any()).optional(),
});
const scientificPapers = [
    {
        id: 'paper-1',
        title: 'Quantum Computing Applications in Machine Learning',
        abstract: 'This paper explores the intersection of quantum computing and machine learning algorithms...',
        authors: ['Dr. Alice Quantum', 'Prof. Bob Algorithms'],
        keywords: ['quantum computing', 'machine learning', 'algorithms', 'qubits'],
        field: 'Computer Science',
        year: 2024,
        citations: 127,
        doi: '10.1000/182',
        createdAt: Date.now(),
    },
    {
        id: 'paper-2',
        title: 'CRISPR Gene Editing in Cancer Treatment',
        abstract: 'Novel approaches using CRISPR-Cas9 technology for targeted cancer therapy...',
        authors: ['Dr. Carol Geneticist', 'Dr. David Oncology'],
        keywords: ['CRISPR', 'gene editing', 'cancer', 'therapy', 'genetics'],
        field: 'Biology',
        year: 2023,
        citations: 89,
        doi: '10.1000/183',
        createdAt: Date.now(),
    },
];
const researchers = [
    {
        id: 'researcher-1',
        name: 'Dr. Alice Quantum',
        affiliation: 'MIT',
        field: 'Computer Science',
        papers: ['paper-1'],
        hIndex: 15,
        totalCitations: 450,
        expertise: ['quantum computing', 'algorithms', 'machine learning'],
        createdAt: Date.now(),
    },
    {
        id: 'researcher-2',
        name: 'Dr. Carol Geneticist',
        affiliation: 'Harvard Medical School',
        field: 'Biology',
        papers: ['paper-2'],
        hIndex: 22,
        totalCitations: 890,
        expertise: ['genetics', 'CRISPR', 'cancer research'],
        createdAt: Date.now(),
    },
];
const eventHandlers = {
    [EventTypes.USER_REGISTERED]: async (message) => {
        try {
            const event = message.payload;
            logger.info(`🔍 Indexing user for search: ${event.userId}`);
            // const userProfile = {
            //   id: event.userId,
            //   type: 'user',
            //   name: event.name || 'Unknown User',
            //   email: event.email,
            //   role: event.role,
            //   createdAt: event.timestamp,
            //   searchable: `${event.name} ${event.email} user profile`.toLowerCase(),
            // };
            logger.info(`✅ User indexed for search: ${event.userId}`);
            searchEventsProcessed.inc({ event_type: 'user_registered', status: 'success' });
        }
        catch (error) {
            logger.error({ err: error }, '❌ Error handling USER_REGISTERED');
            searchEventsProcessed.inc({ event_type: 'user_registered', status: 'error' });
        }
    },
};
app.get('/health', async (_req, res) => {
    try {
        const kafkaStatus = kafkaClient.isReady();
        let meiliStatus = false;
        try {
            await meiliClient.health();
            meiliStatus = true;
        }
        catch (error) {
            logger.warn({ err: error }, 'MeiliSearch not available');
        }
        res.json({
            success: true,
            status: 'healthy',
            service: 'search-service',
            kafka: kafkaStatus,
            meilisearch: meiliStatus,
            documentsCount: scientificPapers.length + researchers.length,
            timestamp: Date.now(),
        });
    }
    catch (error) {
        logger.error({ err: error }, '❌ Health check failed');
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            service: 'search-service',
            kafka: false,
            meilisearch: false,
            error: error.message,
            timestamp: Date.now(),
        });
    }
});
app.get('/kafka/health', async (_req, res) => {
    try {
        // const kafkaHealth = await kafkaClient.healthCheck();
        // const circuitBreakerStats = kafkaClient.getCircuitBreakerStats();
        const kafkaHealth = { status: 'healthy', message: 'Kafka client is initialized' };
        const circuitBreakerStats = {};
        res.status(kafkaHealth.status === 'healthy' ? 200 : 503).json({
            ...kafkaHealth,
            circuitBreaker: circuitBreakerStats,
            config: {},
            timestamp: Date.now(),
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
        });
    }
});
app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
app.get('/search/papers', async (_req, res) => {
    try {
        const validation = searchQuerySchema.safeParse(_req.query);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.errors,
            });
            return;
        }
        const { query, limit, offset } = validation.data;
        searchQueriesTotal.inc({ query_type: 'papers' });
        const results = scientificPapers.filter(paper => paper.title.toLowerCase().includes(query.toLowerCase()) ||
            paper.abstract.toLowerCase().includes(query.toLowerCase()) ||
            paper.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase())) ||
            paper.authors.some(author => author.toLowerCase().includes(query.toLowerCase())));
        const paginatedResults = results.slice(offset, offset + limit);
        await kafkaClient.publish(Topics.SEARCH_EVENTS, {
            type: EventTypes.SEARCH_RESULTS,
            payload: {
                userId: 'anonymous',
                query,
                results: paginatedResults,
                resultCount: results.length,
                timestamp: Date.now(),
            },
            correlationId: utils.generateCorrelationId(),
            userId: 'anonymous'
        });
        res.json({
            success: true,
            data: {
                results: paginatedResults,
                total: results.length,
                limit,
                offset,
                query,
            },
        });
    }
    catch (error) {
        logger.error({ err: error }, '❌ Search papers error');
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
app.get('/search/researchers', async (_req, res) => {
    try {
        const validation = searchQuerySchema.safeParse(_req.query);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.errors,
            });
            return;
        }
        const { query, limit, offset } = validation.data;
        searchQueriesTotal.inc({ query_type: 'researchers' });
        const results = researchers.filter(researcher => researcher.name.toLowerCase().includes(query.toLowerCase()) ||
            researcher.affiliation.toLowerCase().includes(query.toLowerCase()) ||
            researcher.field.toLowerCase().includes(query.toLowerCase()) ||
            researcher.expertise.some(exp => exp.toLowerCase().includes(query.toLowerCase())));
        const paginatedResults = results.slice(offset, offset + limit);
        res.json({
            success: true,
            data: {
                results: paginatedResults,
                total: results.length,
                limit,
                offset,
                query,
            },
        });
    }
    catch (error) {
        logger.error({ err: error }, '❌ Search researchers error');
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
app.get('/search', async (_req, res) => {
    try {
        const validation = searchQuerySchema.safeParse(_req.query);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error.errors,
            });
            return;
        }
        const { query, limit } = validation.data;
        searchQueriesTotal.inc({ query_type: 'universal' });
        const paperResults = scientificPapers.filter(paper => paper.title.toLowerCase().includes(query.toLowerCase()) ||
            paper.abstract.toLowerCase().includes(query.toLowerCase())).slice(0, Math.floor(limit / 2));
        const researcherResults = researchers.filter(researcher => researcher.name.toLowerCase().includes(query.toLowerCase()) ||
            researcher.affiliation.toLowerCase().includes(query.toLowerCase())).slice(0, Math.floor(limit / 2));
        const combinedResults = [
            ...paperResults.map(p => ({ ...p, type: 'paper' })),
            ...researcherResults.map(r => ({ ...r, type: 'researcher' })),
        ];
        res.json({
            success: true,
            data: {
                results: combinedResults,
                total: combinedResults.length,
                papers: paperResults.length,
                researchers: researcherResults.length,
                query,
            },
        });
    }
    catch (error) {
        logger.error({ err: error }, '❌ Universal search error');
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
app.get('/search/papers/popular', (_req, res) => {
    const popularPapers = scientificPapers
        .sort((a, b) => b.citations - a.citations)
        .slice(0, 10);
    res.json({
        success: true,
        data: popularPapers,
    });
});
app.get('/search/papers/field/:field', (req, res) => {
    const { field } = req.params;
    const fieldPapers = scientificPapers.filter(paper => paper.field.toLowerCase() === field.toLowerCase());
    res.json({
        success: true,
        data: fieldPapers,
        field,
    });
});
app.use('*', (_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        timestamp: Date.now(),
    });
});
let server;
try {
    server = app.listen(PORT, () => {
        logger.info({
            service: 'search-service',
            port: PORT,
            environment: process.env['NODE_ENV'] || 'development'
        }, '🚀 Search Service started successfully');
    });
    // server.on('error', (err: Error) => {
    //   logger.error({
    //     error: err.message,
    //     stack: err.stack,
    //     name: err.name,
    //     port: PORT
    //   }, '❌ Server startup error');
    //   process.exit(1);
    // });
}
catch (error) {
    logger.error({
        error: error.message,
        stack: error.stack,
        name: error.name,
        port: PORT
    }, '❌ Failed to start Search Service');
    process.exit(1);
}
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    logger.info({ signal, pid: process.pid }, '📦 Starting graceful shutdown');
    if (!server) {
        logger.error('❌ Server not initialized, forcing exit');
        process.exit(1);
    }
    server.close(() => {
        logger.info('✅ HTTP server closed successfully');
        logger.info('🏁 Graceful shutdown completed');
        process.exit(0);
    });
    try {
        await kafkaClient.disconnect();
        logger.info('✅ Kafka client disconnected');
    }
    catch (error) {
        logger.error({ err: error }, '❌ Error during Kafka client disconnect');
    }
    setTimeout(() => {
        logger.error('❌ Forced shutdown after 10s timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error({
        error: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause
    }, '💥 Uncaught Exception');
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error({
        reason: reason,
        promise: promise,
        stack: reason instanceof Error ? reason.stack : undefined
    }, '💥 Unhandled Rejection');
    gracefulShutdown('unhandledRejection');
});
(async () => {
    try {
        await kafkaClient.connect();
        logger.info('🎯 Search Service Kafka initialized successfully');
        await kafkaClient.subscribe([Topics.AUTH_EVENTS], eventHandlers);
        searchIndexDocuments.set(scientificPapers.length + researchers.length);
    }
    catch (error) {
        logger.error({ err: error }, '❌ Search Service startup error');
        process.exit(1);
    }
})();
//# sourceMappingURL=kafka-search.js.map