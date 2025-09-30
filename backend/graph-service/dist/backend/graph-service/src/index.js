import express from 'express';
import { createKafkaClient, validateBody, graphNodeSchema, graphEdgeSchema, MultiLevelCache, EnvironmentValidator, CommonMiddleware, VersionMiddleware } from '@science-map/shared';
import { logger } from './config';
const app = express();
const PORT = process.env['PORT'] || 3004;
const commonMiddleware = CommonMiddleware.create();
commonMiddleware.setupAll(app, 'graph-service', {
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later.'
    }
});
const versionConfig = {
    serviceName: 'graph-service',
    version: process.env['npm_package_version'] || '1.0.0',
    buildTime: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development',
    dependencies: {
        'express': '^4.18.0',
        'd3': '^7.8.0',
        'visx': '^3.0.0'
    },
    enableVersionHeader: true,
    enableCompatibilityCheck: true,
    enableHealthCheck: true
};
if (process.env['GIT_COMMIT']) {
    versionConfig.gitCommit = process.env['GIT_COMMIT'];
}
if (process.env['GIT_BRANCH']) {
    versionConfig.gitBranch = process.env['GIT_BRANCH'];
}
const versionMiddleware = VersionMiddleware.create(versionConfig);
app.use(versionMiddleware.middleware());
versionMiddleware.setupRoutes(app);
const kafkaClient = createKafkaClient('graph-service');
// const poolManager = new ConnectionPoolManager();
const cache = new MultiLevelCache({
    level: 'l1',
    maxSize: 1000,
    ttl: 300000,
    strategy: 'lru',
    evictionPolicy: 'lru',
    compression: false,
    encryption: false,
    namespace: 'graph-service'
}, process.env['REDIS_URL']);
app.get('/graph/data', async (_req, res) => {
    const cacheKey = 'graph:data';
    try {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
            res.json({
                success: true,
                data: cachedData,
                cached: true
            });
            return;
        }
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
        await cache.set(cacheKey, mockData);
        res.json({
            success: true,
            data: mockData,
            cached: false
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve graph data'
        });
    }
});
app.post('/graph/update', validateBody(graphNodeSchema), async (req, res) => {
    const { id, label, type, properties } = req.body;
    try {
        await cache.invalidate('graph:data');
        res.json({
            success: true,
            message: 'Graph updated',
            data: {
                id,
                label,
                type,
                properties
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update graph'
        });
    }
});
app.post('/graph/edge', validateBody(graphEdgeSchema), async (req, res) => {
    const { id, source, target, type, weight, properties } = req.body;
    try {
        await cache.invalidate('graph:data');
        res.json({
            success: true,
            message: 'Edge created',
            data: {
                id,
                source,
                target,
                type,
                weight,
                properties
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create edge'
        });
    }
});
async function startServer() {
    try {
        const envValidator = EnvironmentValidator.create();
        const result = envValidator.validateServiceEnvironment('graph-service');
        if (!result.isValid) {
            logger.error({ errors: result.errors }, 'Environment validation failed');
            process.exit(1);
        }
        if (result.warnings.length > 0) {
            logger.warn({ warnings: result.warnings }, 'Environment warnings');
        }
        logger.info('Environment validation completed');
        await kafkaClient.connect();
        logger.info('Graph Service Kafka connected');
        logger.info('Graph Service connection pools initialized');
        app.listen(PORT, () => {
            logger.info(`Graph Service running on port ${PORT}`);
        });
    }
    catch (error) {
        logger.error({ error }, 'Graph Service startup error');
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    await kafkaClient.disconnect();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map