import express, { Request, Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { Counter, Gauge, register, collectDefaultMetrics } from 'prom-client';
import { createKafkaClient, EventTypes, Topics, utils, CommonMiddleware, KafkaClient } from '@science-map/shared';

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
const PORT = process.env['PORT'] || 3004;

interface GraphNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  userId: string;
  createdAt: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface UserGraph {
  userId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: number;
  updatedAt: number;
}


let kafkaClient: KafkaClient;

const graphRequestsTotal = new Counter({
  name: 'graph_requests_total',
  help: 'Total number of graph requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});


const userGraphsTotal = new Gauge({
  name: 'graph_user_graphs_total',
  help: 'Total number of user graphs',
  registers: [register]
});

const graphNodesTotal = new Gauge({
  name: 'graph_nodes_total',
  help: 'Total number of graph nodes',
  registers: [register]
});

// const graphEdgesTotal = new Gauge({
//   name: 'graph_edges_total',
//   help: 'Total number of graph edges',
//   registers: [register]
// });

const userGraphs = new Map<string, UserGraph>();

app.use(pinoHttp({ logger }));

app.use((req: Request, res: Response, next) => {
  // const start = Date.now();
  res.on('finish', () => {
    const route = (req as any).route?.path || req.path;
    graphRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString()
    });
  });
  next();
});

const commonMiddleware = CommonMiddleware.create(logger);
commonMiddleware.setupAll(app, 'graph-service', {
  cors: {
    origin: process.env['FRONTEND_URL'] || '*',
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests'
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info'
  }
});


app.get('/health', (_req: Request, res: Response): void => {
  const kafkaReady = !!kafkaClient;
  res.json({
    success: true,
    status: 'healthy',
    service: 'graph-service',
    kafka: kafkaReady,
    userGraphsCount: userGraphs.size,
    timestamp: Date.now(),
  });
});

app.get('/metrics', async (_req: Request, res: Response): Promise<void> => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/graph/data/:userId?', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['userId'];
    if (!userId) {
      res.json({
        success: true,
        data: {
          totalUsers: userGraphs.size,
          totalNodes: Array.from(userGraphs.values()).reduce((sum, graph) => sum + graph.nodes.length, 0),
          totalEdges: Array.from(userGraphs.values()).reduce((sum, graph) => sum + graph.edges.length, 0)
        }
      });
      return;
    }
    
    const userGraph = userGraphs.get(userId);
    if (!userGraph) {
      res.status(404).json({
        success: false,
        error: 'User graph not found'
      });
      return;
    }
    
    if (kafkaClient) {
      const requestEvent = {
        userId,
        timestamp: Date.now()
      };
      await kafkaClient.publish(Topics.GRAPH_EVENTS, {
        type: EventTypes.GRAPH_DATA_REQUESTED,
        payload: requestEvent,
        correlationId: utils.generateCorrelationId(),
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
  } catch (error) {
    logger.error('❌ Error getting graph data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/graph/node', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, type, x, y } = req.body;
    if (!userId || !name || !type) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, name, type'
      });
      return;
    }
    
    let userGraph = userGraphs.get(userId);
    if (!userGraph) {
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
    
    const newNode: GraphNode = {
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
    
    if (kafkaClient) {
      await kafkaClient.publish(Topics.GRAPH_EVENTS, {
        type: EventTypes.NODE_CREATED,
        payload: newNode,
        correlationId: utils.generateCorrelationId(),
        userId
      });
    }
    
    res.json({
      success: true,
      data: newNode
    });
  } catch (error) {
    logger.error('❌ Error creating node:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/graph/users', (_req: Request, res: Response): void => {
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
  } catch (error) {
    logger.error('❌ Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

async function initializeKafka(): Promise<void> {
  try {
    kafkaClient = createKafkaClient('graph-service');
    await kafkaClient.connect();
    
    // await kafkaClient.subscribe([Topics.AUTH_EVENTS], eventHandlers);
    logger.info('🎯 Graph Service Kafka initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize Kafka:', error);
    process.exit(1);
  }
}

const server = app.listen(PORT, async () => {
  logger.info({
    service: 'graph-service',
    port: PORT,
    environment: process.env['NODE_ENV'] || 'development'
  }, '🚀 Graph Service started successfully');
  await initializeKafka();
});

let isShuttingDown = false;

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`📦 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    if (kafkaClient) {
      await kafkaClient.disconnect();
      logger.info('✅ Kafka disconnected');
    }
  } catch (error) {
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