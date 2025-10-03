import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});

collectDefaultMetrics({ register });

const gatewayRequestsTotal = new Counter({
    name: 'gateway_requests_total',
    help: 'Total number of requests through API Gateway',
    labelNames: ['method', 'route', 'service', 'status_code'],
    registers: [register]
});

const gatewayRequestDuration = new Histogram({
    name: 'gateway_request_duration_seconds',
    help: 'Duration of requests through API Gateway',
    labelNames: ['method', 'route', 'service', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
});

const serviceHealthStatus = new Counter({
    name: 'gateway_service_health_checks_total',
    help: 'Total number of service health checks',
    labelNames: ['service', 'status'],
    registers: [register]
});

const app = express();
const PORT = process.env.PORT || 3000;

const handleServiceError = (res: Response, serviceName: string) => {
    res.status(500).json({
        success: false,
        error: `${serviceName} service unavailable`,
    });
};

const proxyToService = async (
    req: Request, 
    res: Response, 
    serviceUrl: string, 
    path: string, 
    method: string = 'GET'
) => {
    try {
        const config: {
            method: string;
            url: string;
            timeout: number;
            data?: unknown;
            params?: unknown;
            headers?: Record<string, string>;
        } = {
            method,
            url: `${serviceUrl}${path}`,
            timeout: 5000
        };
        
        if (method === 'POST') {
            config.data = req.body;
        } else if (method === 'GET' && req.query) {
            config.params = req.query;
        }
        
        if (req.headers.authorization) {
            config.headers = { Authorization: req.headers.authorization };
        }
        
        const response = await axios(config);
        res.json(response.data);
    } catch (error) {
        const serviceName = Object.keys(SERVICES).find(key => SERVICES[key as keyof typeof SERVICES] === serviceUrl) || 'Unknown';
        logger.error({
            error: error instanceof Error ? error.message : String(error),
            serviceName,
            serviceUrl,
            method,
            path
        }, 'Service proxy error');
        handleServiceError(res, serviceName);
    }
};

app.use(pinoHttp({ logger: logger }));

// Helper function to determine service from path
const getServiceFromPath = (path: string): string => {
    if (path.startsWith('/api/auth')) return 'auth';
    if (path.startsWith('/api/graph')) return 'graph';
    if (path.startsWith('/api/search')) return 'search';
    if (path.startsWith('/api/jobs')) return 'jobs';
    if (path.startsWith('/api/errors')) return 'gateway';
    if (path.startsWith('/api/health')) return 'gateway';
    if (path.startsWith('/metrics')) return 'gateway';
    return 'gateway';
};

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        
        const service = getServiceFromPath(req.path);
        
        gatewayRequestsTotal.inc({
            method: req.method,
            route: route,
            service: service,
            status_code: res.statusCode.toString()
        });
        
        gatewayRequestDuration.observe({
            method: req.method,
            route: route,
            service: service,
            status_code: res.statusCode.toString()
        }, duration);
    });
    next();
});

app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests',
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Service URLs configuration - should match gateway.service.ts
const SERVICES = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    graph: process.env.GRAPH_SERVICE_URL || 'http://localhost:3002',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3003',
    jobs: process.env.JOBS_SERVICE_URL || 'http://localhost:3004'
};

app.get('/api/health', async (req, res) => {
    const healthChecks: Record<string, unknown> = {};
    
    for (const [service, url] of Object.entries(SERVICES)) {
        try {
            const response = await axios.get(`${url}/health`, { timeout: 5000 });
            healthChecks[service] = response.data;
            serviceHealthStatus.inc({ service, status: 'healthy' });
        } catch (error) {
            logger.warn({
                service,
                url,
                error: error instanceof Error ? error.message : String(error),
                action: 'health-check-failed'
            }, 'Service health check failed');
            healthChecks[service] = { success: false, error: 'Service unavailable' };
            serviceHealthStatus.inc({ service, status: 'unhealthy' });
        }
    }
    
    res.json({
        success: true,
        status: 'healthy',
        services: healthChecks,
        timestamp: Date.now(),
    });
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.get('/api/graph/data', async (req, res) => {
    await proxyToService(req, res, SERVICES.graph, '/data', 'GET');
});

app.get('/api/search', async (req, res) => {
    await proxyToService(req, res, SERVICES.search, '/search', 'GET');
});

app.post('/api/auth/register', async (req, res) => {
    await proxyToService(req, res, SERVICES.auth, '/auth/register', 'POST');
});

app.post('/api/auth/login', async (req, res) => {
    await proxyToService(req, res, SERVICES.auth, '/auth/login', 'POST');
});

app.post('/api/auth/refresh', async (req, res) => {
    await proxyToService(req, res, SERVICES.auth, '/auth/refresh', 'POST');
});

app.get('/api/auth/me', async (req, res) => {
    await proxyToService(req, res, SERVICES.auth, '/auth/me', 'GET');
});

app.post('/api/auth/logout', async (req, res) => {
    await proxyToService(req, res, SERVICES.auth, '/auth/logout', 'POST');
});

app.post('/api/errors/report', async (req, res) => {
    try {
        const errorReport = {
            ...req.body,
            timestamp: Date.now(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            referer: req.headers.referer
        };
        
        logger.error({
            ...errorReport,
            action: 'frontend-error-report'
        }, 'Frontend Error Report');
        
        gatewayRequestsTotal.inc({
            method: 'POST',
            route: '/api/errors/report',
            status_code: '200'
        });
        
        res.json({
            success: true,
            message: 'Error report received',
            errorId: errorReport.errorId || 'unknown'
        });
    } catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : String(error),
            action: 'error-report-processing'
        }, 'Failed to process error report');
        res.status(500).json({
            success: false,
            error: 'Failed to process error report'
        });
    }
});

app.get('/api/jobs', async (req, res) => {
    await proxyToService(req, res, SERVICES.jobs, '/jobs', 'GET');
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Science Map API Gateway',
        version: '1.0.0',
        services: Object.keys(SERVICES),
        timestamp: Date.now(),
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        timestamp: Date.now(),
    });
});

const server = app.listen(Number(PORT), () => {
    logger.info({
        service: 'api-gateway',
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    }, 'API Gateway started successfully');
});

let isShuttingDown = false;

const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info({
        signal,
        action: 'graceful-shutdown-start'
    }, 'Received signal, starting graceful shutdown');
    
    server.close((err) => {
        if (err) {
            logger.error({
                error: err instanceof Error ? err.message : String(err),
                action: 'server-shutdown-error'
            }, 'Error during server shutdown');
            process.exit(1);
        }
        logger.info({
            action: 'server-closed'
        }, 'HTTP server closed');
        logger.info({
            action: 'graceful-shutdown-completed'
        }, 'Graceful shutdown completed');
        process.exit(0);
    });
    
    setTimeout(() => {
        logger.error({
            action: 'forced-shutdown-timeout'
        }, 'Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        action: 'uncaught-exception'
    }, 'Uncaught Exception');
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error({
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: promise.toString(),
        action: 'unhandled-rejection'
    }, 'Unhandled Rejection');
    gracefulShutdown('unhandledRejection');
});
