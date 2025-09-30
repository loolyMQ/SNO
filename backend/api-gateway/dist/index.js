"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const prom_client_1 = require("prom-client");
const logger = (0, pino_1.default)({
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
(0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register });
const gatewayRequestsTotal = new prom_client_1.Counter({
    name: 'gateway_requests_total',
    help: 'Total number of requests through API Gateway',
    labelNames: ['method', 'route', 'service', 'status_code'],
    registers: [prom_client_1.register]
});
const gatewayRequestDuration = new prom_client_1.Histogram({
    name: 'gateway_request_duration_seconds',
    help: 'Duration of requests through API Gateway',
    labelNames: ['method', 'route', 'service', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [prom_client_1.register]
});
const serviceHealthStatus = new prom_client_1.Counter({
    name: 'gateway_service_health_checks_total',
    help: 'Total number of service health checks',
    labelNames: ['service', 'status'],
    registers: [prom_client_1.register]
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
const handleServiceError = (res, serviceName) => {
    res.status(500).json({
        success: false,
        error: `${serviceName} service unavailable`,
    });
};
const proxyToService = async (req, res, serviceUrl, path, method = 'GET') => {
    try {
        const config = {
            method,
            url: `${serviceUrl}${path}`,
            timeout: 5000
        };
        if (method === 'POST') {
            config.data = req.body;
        }
        else if (method === 'GET' && req.query) {
            config.params = req.query;
        }
        if (req.headers.authorization) {
            config.headers = { Authorization: req.headers.authorization };
        }
        const response = await (0, axios_1.default)(config);
        res.json(response.data);
    }
    catch (error) {
        const serviceName = Object.keys(SERVICES).find(key => SERVICES[key] === serviceUrl) || 'Unknown';
        handleServiceError(res, serviceName);
    }
};
app.use((0, pino_http_1.default)({ logger }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const service = req.path.startsWith('/api/auth') ? 'auth' :
            req.path.startsWith('/api/graph') ? 'graph' :
                req.path.startsWith('/api/search') ? 'search' :
                    req.path.startsWith('/api/jobs') ? 'jobs' : 'gateway';
        gatewayRequestsTotal.inc({
            method: req.method,
            route,
            service,
            status_code: res.statusCode.toString()
        });
        gatewayRequestDuration.observe({
            method: req.method,
            route,
            service,
            status_code: res.statusCode.toString()
        }, duration);
    });
    next();
});
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests',
});
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const SERVICES = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3003',
    graph: process.env.GRAPH_SERVICE_URL || 'http://localhost:3004',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3005',
    jobs: process.env.JOBS_SERVICE_URL || 'http://localhost:3006'
};
app.get('/api/health', async (req, res) => {
    const healthChecks = {};
    for (const [service, url] of Object.entries(SERVICES)) {
        try {
            const response = await axios_1.default.get(`${url}/health`, { timeout: 5000 });
            healthChecks[service] = response.data;
            serviceHealthStatus.inc({ service, status: 'healthy' });
        }
        catch (error) {
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
    res.set('Content-Type', prom_client_1.register.contentType);
    res.end(await prom_client_1.register.metrics());
});
app.get('/api/graph/data', async (req, res) => {
    await proxyToService(req, res, SERVICES.graph, '/graph/data', 'GET');
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
// 🚨 Error reporting endpoint
app.post('/api/errors/report', async (req, res) => {
    try {
        const errorReport = {
            ...req.body,
            timestamp: Date.now(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            referer: req.headers.referer
        };
        logger.error('🚨 Frontend Error Report:', errorReport);
        // Увеличиваем счетчик ошибок
        gatewayRequestsTotal.inc({
            method: 'POST',
            route: '/api/errors/report',
            status_code: '200'
        });
        // TODO: В будущем можно отправлять в Kafka или внешний сервис мониторинга
        // await kafkaClient.publish('error-events', {
        //   type: 'frontend.error',
        //   payload: errorReport
        // });
        res.json({
            success: true,
            message: 'Error report received',
            errorId: errorReport.errorId
        });
    }
    catch (error) {
        logger.error('❌ Failed to process error report:', error);
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
const server = app.listen(PORT, () => {
    logger.info({
        service: 'api-gateway',
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    }, '🚀 API Gateway started successfully');
});
let isShuttingDown = false;
const gracefulShutdown = (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    logger.info(`📦 Received ${signal}. Starting graceful shutdown...`);
    server.close((err) => {
        if (err) {
            logger.error('❌ Error during server shutdown:', err);
            process.exit(1);
        }
        logger.info('✅ HTTP server closed');
        logger.info('🏁 Graceful shutdown completed');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    logger.error('💥 Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
