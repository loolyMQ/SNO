"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = __importDefault(require("prom-client"));
const shared_1 = require("@science-map/shared");
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
        },
    },
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
// Prometheus metrics
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register });
const httpRequestCounter = new prom_client_1.default.Counter({
    name: 'graph_service_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestCounter);
// Kafka configuration is handled by createKafkaClient
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Metrics endpoint
app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});
const kafkaClient = (0, shared_1.createKafkaClient)('graph-service');
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        service: 'graph-service',
        timestamp: Date.now(),
    });
});
app.get('/graph/data', (_req, res) => {
    const mockData = {
        nodes: [
            { id: 1, name: 'Computer Science', x: 100, y: 100 },
            { id: 2, name: 'Mathematics', x: 200, y: 150 },
            { id: 3, name: 'Physics', x: 150, y: 200 },
        ],
        edges: [
            { source: 1, target: 2, weight: 0.8 },
            { source: 2, target: 3, weight: 0.6 },
        ],
    };
    res.json({
        success: true,
        data: mockData,
    });
});
app.post('/graph/update', (_req, res) => {
    res.json({
        success: true,
        message: 'Graph updated',
    });
});
async function startServer() {
    try {
        await kafkaClient.connect();
        logger.info({
            service: 'graph-service',
            action: 'kafka-connect'
        }, 'Graph Service Kafka connected');
        app.listen(Number(PORT), () => {
            logger.info({
                service: 'graph-service',
                port: PORT,
                action: 'server-start'
            }, 'Graph Service running');
        });
    }
    catch (error) {
        logger.error({
            service: 'graph-service',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            action: 'startup-error'
        }, 'Graph Service startup error');
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    await kafkaClient.disconnect();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map