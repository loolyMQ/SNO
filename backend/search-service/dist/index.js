import express from 'express';
import pino from 'pino';
import { createKafkaClient, validateQuery, searchQuerySchema, MultiLevelCache, EnvironmentValidator, CommonMiddleware } from '@science-map/shared';
const app = express();
const PORT = process.env['PORT'] || 3004;
const logger = pino({
    level: process.env['LOG_LEVEL'] || 'info'
});
// const config: ServiceConfig = {
//   port: Number(PORT),
//   kafka: {
//     brokers: [process.env['KAFKA_BROKER'] || 'localhost:9092']
//   },
// };
const commonMiddleware = CommonMiddleware.create();
commonMiddleware.setupAll(app, 'search-service', {
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: 'Too many search requests from this IP, please try again later.'
    }
});
const { CentralizedVersionMiddleware } = require('@science-map/shared');
CentralizedVersionMiddleware.initialize(logger);
CentralizedVersionMiddleware.createForService({
    serviceName: 'search-service',
    dependencies: {
        'express': '^4.18.0',
        'meilisearch': '^0.32.0',
        'elasticsearch': '^8.0.0'
    }
});
app.use(CentralizedVersionMiddleware.getMiddleware('search-service'));
CentralizedVersionMiddleware.setupRoutes(app, 'search-service');
const kafkaClient = createKafkaClient('search-service');
// const poolManager = new ConnectionPoolManager();
const cache = new MultiLevelCache({
    maxSize: 2000,
    ttl: 600000,
    level: 'l1',
    strategy: 'lru',
    evictionPolicy: 'lru',
    compression: false,
    encryption: false,
    namespace: 'search-service'
}, process.env['REDIS_URL']);
app.get('/search', validateQuery(searchQuerySchema), async (req, res) => {
    const { query, filters, limit, offset, sortBy } = req.query;
    const cacheKey = `search:${JSON.stringify({ query, filters, limit, offset, sortBy })}`;
    try {
        const cachedResults = await cache.get(cacheKey);
        if (cachedResults) {
            res.json({
                success: true,
                results: cachedResults,
                query,
                filters,
                limit,
                offset,
                sortBy,
                cached: true
            });
            return;
        }
        const mockResults = [
            { id: 1, title: 'Computer Science', type: 'field' },
            { id: 2, title: 'Machine Learning', type: 'topic' },
            { id: 3, title: 'Data Structures', type: 'concept' },
        ].filter(item => !query || item.title.toLowerCase().includes(query.toLowerCase()));
        await cache.set(cacheKey, mockResults);
        res.json({
            success: true,
            results: mockResults,
            query,
            filters,
            limit,
            offset,
            sortBy,
            cached: false
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});
async function startServer() {
    try {
        const envValidator = EnvironmentValidator.create();
        const result = envValidator.validateServiceEnvironment('search-service');
        if (!result.isValid) {
            logger.error({ errors: result.errors }, 'Environment validation failed');
            process.exit(1);
        }
        if (result.warnings.length > 0) {
            logger.warn({ warnings: result.warnings }, 'Environment warnings');
        }
        logger.info('Environment validation completed');
        await kafkaClient.connect();
        logger.info('Search Service Kafka connected');
        // await poolManager.initialize();
        logger.info('Search Service connection pools initialized');
        app.listen(PORT, () => {
            logger.info(`Search Service running on port ${PORT}`);
        });
    }
    catch (error) {
        logger.error({ error }, 'Search Service startup error');
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    await kafkaClient.disconnect();
    // await poolManager.shutdown();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map