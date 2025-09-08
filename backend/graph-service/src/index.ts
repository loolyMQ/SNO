import express from 'express';
import neo4j from 'neo4j-driver';
import { z } from 'zod';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';

const app = express();
const port = process.env['PORT'] || 3003;
const metricsPort = 9093;

// Инициализация логгера
const logger = new Logger({
  service: 'graph-service',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация мониторинга
const monitoring = createMonitoring({
  serviceName: 'graph-service',
  serviceVersion: '0.1.0',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: 'graph-service',
}, logger);

// Neo4j подключение
const driver = neo4j.driver(
  process.env['NEO4J_URI'] || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env['NEO4J_USER'] || 'neo4j',
    process.env['NEO4J_PASSWORD'] || 'password'
  )
);

// Middleware
app.use(express.json());

// Мониторинг middleware
app.use(monitoring.middleware.express);

// Схемы валидации
const createNodeSchema = z.object({
  type: z.enum(['institute', 'department', 'researcher']),
  name: z.string().min(1),
  properties: z.record(z.any()).optional(),
});

const createRelationshipSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  type: z.string(),
  properties: z.record(z.any()).optional(),
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await monitoring.health.checkAll();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'graph-service',
      version: '0.1.0',
      dependencies: healthStatus,
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'graph-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Создание узла
app.post('/api/graph/nodes', async (req, res) => {
  try {
    const validatedData = createNodeSchema.parse(req.body);
    const { type, name, properties = {} } = validatedData;

    const session = driver.session();
    
    try {
      const result = await session.run(
        `CREATE (n:${type} {name: $name, properties: $properties, createdAt: datetime()})
         RETURN n`,
        { name, properties }
      );

      const node = result.records[0].get('n');
      const nodeId = node.identity.toString();

      // Отправляем событие в Kafka
      await kafkaClient.sendMessage({
        topic: 'graph-events',
        key: nodeId,
        value: {
          event: 'node.created',
          data: {
            id: nodeId,
            type,
            name,
            properties,
            createdAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          source: 'graph-service',
        },
        headers: {
          'content-type': 'application/json',
          'source': 'graph-service',
        },
      });

      logger.info('Node created successfully', {
        nodeId,
        type,
        name,
      });

      res.status(201).json({
        success: true,
        message: 'Node created successfully',
        node: {
          id: nodeId,
          type,
          name,
          properties,
        },
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Failed to create node', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Failed to create node',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Создание связи
app.post('/api/graph/relationships', async (req, res) => {
  try {
    const validatedData = createRelationshipSchema.parse(req.body);
    const { fromId, toId, type, properties = {} } = validatedData;

    const session = driver.session();
    
    try {
      const result = await session.run(
        `MATCH (a), (b)
         WHERE id(a) = $fromId AND id(b) = $toId
         CREATE (a)-[r:${type} {properties: $properties, createdAt: datetime()}]->(b)
         RETURN r`,
        { fromId: parseInt(fromId), toId: parseInt(toId), properties }
      );

      if (result.records.length === 0) {
        return res.status(404).json({
          error: 'Nodes not found',
          message: 'One or both nodes not found',
        });
      }

      const relationship = result.records[0].get('r');
      const relationshipId = relationship.identity.toString();

      // Отправляем событие в Kafka
      await kafkaClient.sendMessage({
        topic: 'graph-events',
        key: relationshipId,
        value: {
          event: 'relationship.created',
          data: {
            id: relationshipId,
            fromId,
            toId,
            type,
            properties,
            createdAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          source: 'graph-service',
        },
        headers: {
          'content-type': 'application/json',
          'source': 'graph-service',
        },
      });

      logger.info('Relationship created successfully', {
        relationshipId,
        fromId,
        toId,
        type,
      });

      res.status(201).json({
        success: true,
        message: 'Relationship created successfully',
        relationship: {
          id: relationshipId,
          fromId,
          toId,
          type,
          properties,
        },
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Failed to create relationship', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Failed to create relationship',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Получение узлов
app.get('/api/graph/nodes', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    
    const session = driver.session();
    
    try {
      let query = 'MATCH (n)';
      const params: any = { limit: parseInt(limit as string) };
      
      if (type) {
        query += ` WHERE n:${type}`;
      }
      
      query += ' RETURN n LIMIT $limit';

      const result = await session.run(query, params);
      
      const nodes = result.records.map(record => {
        const node = record.get('n');
        return {
          id: node.identity.toString(),
          labels: node.labels,
          properties: node.properties,
        };
      });

      res.status(200).json({
        success: true,
        nodes,
        count: nodes.length,
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Failed to get nodes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Failed to get nodes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Получение связей
app.get('/api/graph/relationships', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    
    const session = driver.session();
    
    try {
      let query = 'MATCH ()-[r]->()';
      const params: any = { limit: parseInt(limit as string) };
      
      if (type) {
        query += ` WHERE type(r) = '${type}'`;
      }
      
      query += ' RETURN r LIMIT $limit';

      const result = await session.run(query, params);
      
      const relationships = result.records.map(record => {
        const rel = record.get('r');
        return {
          id: rel.identity.toString(),
          type: rel.type,
          properties: rel.properties,
        };
      });

      res.status(200).json({
        success: true,
        relationships,
        count: relationships.length,
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Failed to get relationships', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Failed to get relationships',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await kafkaClient.disconnect();
    await driver.close();
    await monitoring.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await kafkaClient.disconnect();
    await driver.close();
    await monitoring.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Подключаемся к Kafka
    await kafkaClient.connect();
    logger.info('Connected to Kafka');

    // Создаем топик для событий графа
    await kafkaClient.createTopic('graph-events', 3, 1);
    logger.info('Created graph-events topic');

    // Запускаем сервер метрик
    const metricsServer = new MetricsServer(metricsPort);
    await metricsServer.start();
    logger.info(`Metrics server started on port ${metricsPort}`);

    // Запускаем основной сервер
    app.listen(port, () => {
      logger.info(`Graph service server started on port ${port}`, {
        port,
        metricsPort,
        environment: process.env['NODE_ENV'] || 'development',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

startServer();
