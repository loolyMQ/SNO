"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
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
const PORT = process.env.PORT || 3005;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const kafkaClient = (0, shared_1.createKafkaClient)('jobs-service');
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        service: 'jobs-service',
        timestamp: Date.now(),
    });
});
app.get('/jobs', (_req, res) => {
    const mockJobs = [
        { id: 1, type: 'data-processing', status: 'completed' },
        { id: 2, type: 'report-generation', status: 'running' },
        { id: 3, type: 'backup', status: 'pending' },
    ];
    res.json({
        success: true,
        jobs: mockJobs,
    });
});
app.post('/jobs', (req, res) => {
    res.json({
        success: true,
        job: { id: Date.now(), type: req.body.type, status: 'queued' },
    });
});
async function startServer() {
    try {
        await kafkaClient.connect();
        logger.info({
            service: 'jobs-service',
            action: 'kafka-connect'
        }, 'Jobs Service Kafka connected');
        app.listen(Number(PORT), () => {
            logger.info({
                service: 'jobs-service',
                port: PORT,
                action: 'server-start'
            }, 'Jobs Service running');
        });
    }
    catch (error) {
        logger.error({
            service: 'jobs-service',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            action: 'startup-error'
        }, 'Jobs Service startup error');
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    await kafkaClient.disconnect();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map