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
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const prom_client_1 = require("prom-client");
const shared_1 = require("@science-map/shared");
(0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register });
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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3004;
let kafkaClient;
// 📊 Prometheus Metrics
const graphRequestsTotal = new prom_client_1.Counter({
    name: 'graph_requests_total',
    help: 'Total number of graph requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [prom_client_1.register]
});
const graphEventsProcessed = new prom_client_1.Counter({
    name: 'graph_events_processed_total',
    help: 'Total number of graph events processed',
    labelNames: ['event_type', 'status'],
    registers: [prom_client_1.register]
});
const userGraphsTotal = new prom_client_1.Gauge({
    name: 'graph_user_graphs_total',
    help: 'Total number of user graphs',
    registers: [prom_client_1.register]
});
const graphNodesTotal = new prom_client_1.Gauge({
    name: 'graph_nodes_total',
    help: 'Total number of graph nodes',
    registers: [prom_client_1.register]
});
const graphEdgesTotal = new prom_client_1.Gauge({
    name: 'graph_edges_total',
    help: 'Total number of graph edges',
    registers: [prom_client_1.register]
});
const userGraphs = new Map();
// 🔧 Middleware
app.use((0, pino_http_1.default)({ logger }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        graphRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode.toString()
        });
    });
    next();
});
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(express_1.default.json());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// 🔥 Kafka Event Handlers
const eventHandlers = {
    [shared_1.EventTypes.USER_REGISTERED]: async (message) => {
        try {
            const event = message.payload;
            logger.info(`👤 Creating graph for new user: ${event.userId}`);
            // Создаем пустой граф для нового пользователя
            const newGraph = {
                userId: event.userId,
                nodes: [
                    {
                        id: `welcome-${event.userId}`,
                        name: 'Добро пожаловать в Карту Науки!',
                        type: 'welcome',
                        x: 400,
                        y: 300,
                        userId: event.userId,
                        createdAt: Date.now()
                    }
                ],
                edges: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            userGraphs.set(event.userId, newGraph);
            userGraphsTotal.inc();
            graphNodesTotal.inc();
            graphEventsProcessed.inc({ event_type: 'user_registered', status: 'success' });
            // 🚀 Publish Graph Event
            if (kafkaClient?.isReady()) {
                const graphEvent = {
                    userId: event.userId,
                    nodeCount: 1,
                    edgeCount: 0,
                    timestamp: Date.now()
                };
                await kafkaClient.publish(shared_1.Topics.GRAPH_EVENTS, {
                    type: shared_1.EventTypes.GRAPH_DATA_UPDATED,
                    payload: graphEvent,
                    correlationId: message.correlationId,
                    userId: event.userId
                });
            }
            logger.info(`✅ Graph created for user ${event.userId}`);
        }
        catch (error) {
            logger.error('❌ Error handling USER_REGISTERED:', error);
            graphEventsProcessed.inc({ event_type: 'user_registered', status: 'error' });
        }
    },
    [shared_1.EventTypes.USER_LOGIN]: async (message) => {
        try {
            const event = message.payload;
            logger.info(`🔄 User login: ${event.userId}`);
            // Можно добавить логику обновления "последний вход"
            const userGraph = userGraphs.get(event.userId);
            if (userGraph) {
                userGraph.updatedAt = Date.now();
            }
            graphEventsProcessed.inc({ event_type: 'user_login', status: 'success' });
        }
        catch (error) {
            logger.error('❌ Error handling USER_LOGIN:', error);
            graphEventsProcessed.inc({ event_type: 'user_login', status: 'error' });
        }
    }
};
// 🌐 API Endpoints
app.get('/health', (req, res) => {
    const kafkaReady = kafkaClient?.isReady() || false;
    res.json({
        success: true,
        status: 'healthy',
        service: 'graph-service',
        kafka: kafkaReady,
        userGraphsCount: userGraphs.size,
        timestamp: Date.now(),
    });
});
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prom_client_1.register.contentType);
    res.end(await prom_client_1.register.metrics());
});
app.get('/graph/data/:userId?', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            // Возвращаем общую статистику
            return res.json({
                success: true,
                data: {
                    totalUsers: userGraphs.size,
                    totalNodes: Array.from(userGraphs.values()).reduce((sum, graph) => sum + graph.nodes.length, 0),
                    totalEdges: Array.from(userGraphs.values()).reduce((sum, graph) => sum + graph.edges.length, 0)
                }
            });
        }
        const userGraph = userGraphs.get(userId);
        if (!userGraph) {
            return res.status(404).json({
                success: false,
                error: 'User graph not found'
            });
        }
        // 🚀 Publish Graph Request Event
        if (kafkaClient?.isReady()) {
            const requestEvent = {
                userId,
                timestamp: Date.now()
            };
            await kafkaClient.publish(shared_1.Topics.GRAPH_EVENTS, {
                type: shared_1.EventTypes.GRAPH_DATA_REQUESTED,
                payload: requestEvent,
                correlationId: shared_1.utils.generateCorrelationId(),
                userId
            });
        }
        res.json({
            success: true,
            data: {
                nodes: userGraph.nodes,
                edges: userGraph.edges,
                metadata: {
                    userId: userGraph.userId,
                    nodeCount: userGraph.nodes.length,
                    edgeCount: userGraph.edges.length,
                    createdAt: userGraph.createdAt,
                    updatedAt: userGraph.updatedAt
                }
            }
        });
    }
    catch (error) {
        logger.error('❌ Error getting graph data:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
app.post('/graph/node', async (req, res) => {
    try {
        const { userId, name, type, x, y } = req.body;
        if (!userId || !name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, name, type'
            });
        }
        let userGraph = userGraphs.get(userId);
        if (!userGraph) {
            // Создаем новый граф если не существует
            userGraph = {
                userId,
                nodes: [],
                edges: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            userGraphs.set(userId, userGraph);
            userGraphsTotal.inc();
        }
        const newNode = {
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            x: x || Math.random() * 800,
            y: y || Math.random() * 600,
            userId,
            createdAt: Date.now()
        };
        userGraph.nodes.push(newNode);
        userGraph.updatedAt = Date.now();
        graphNodesTotal.inc();
        // 🚀 Publish Graph Update Event
        if (kafkaClient?.isReady()) {
            await kafkaClient.publish(shared_1.Topics.GRAPH_EVENTS, {
                type: shared_1.EventTypes.NODE_CREATED,
                payload: newNode,
                correlationId: shared_1.utils.generateCorrelationId(),
                userId
            });
        }
        res.json({
            success: true,
            data: newNode
        });
    }
    catch (error) {
        logger.error('❌ Error creating node:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
app.get('/graph/users', (req, res) => {
    try {
        const userStats = Array.from(userGraphs.entries()).map(([userId, graph]) => ({
            userId,
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            createdAt: graph.createdAt,
            updatedAt: graph.updatedAt
        }));
        res.json({
            success: true,
            data: {
                totalUsers: userGraphs.size,
                users: userStats
            }
        });
    }
    catch (error) {
        logger.error('❌ Error getting user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// 🚀 Initialize Kafka
async function initializeKafka() {
    try {
        kafkaClient = (0, shared_1.createKafkaClient)('graph-service');
        await kafkaClient.connect();
        // Subscribe to auth events
        await kafkaClient.subscribe([shared_1.Topics.AUTH_EVENTS], eventHandlers);
        logger.info('🎯 Graph Service Kafka initialized successfully');
    }
    catch (error) {
        logger.error('❌ Failed to initialize Kafka:', error);
        process.exit(1);
    }
}
const server = app.listen(PORT, async () => {
    logger.info({
        service: 'graph-service',
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    }, '🚀 Graph Service started successfully');
    await initializeKafka();
});
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    logger.info(`📦 Received ${signal}. Starting graceful shutdown...`);
    try {
        if (kafkaClient) {
            await kafkaClient.disconnect();
            logger.info('✅ Kafka disconnected');
        }
    }
    catch (error) {
        logger.error('❌ Error disconnecting Kafka:', error);
    }
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
