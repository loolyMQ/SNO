import express from 'express';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';
import neo4j from 'neo4j-driver';
import { z } from 'zod';

const SERVICE_NAME = 'graph-service';
const PORT = parseInt(process.env['PORT'] || '3003', 10);
const METRICS_PORT = parseInt(process.env['METRICS_PORT'] || '9093', 10);
const NEO4J_URI = process.env['NEO4J_URI'] || 'bolt://localhost:7687';
const NEO4J_USER = process.env['NEO4J_USER'] || 'neo4j';
const NEO4J_PASSWORD = process.env['NEO4J_PASSWORD'] || 'password';

const logger = new Logger({
  service: SERVICE_NAME,
  environment: (process.env['NODE_ENV'] as 'development' | 'staging' | 'production') || 'development',
} as any);

const monitoring = createMonitoring({
  serviceName: SERVICE_NAME,
  serviceVersion: '1.0.0',
  environment: (process.env['NODE_ENV'] as 'development' | 'staging' | 'production') || 'development',
  metrics: {
    enabled: true,
    port: METRICS_PORT,
    endpoint: '/metrics',
    collectDefaultMetrics: true,
  },
  tracing: {
    enabled: true,
    exporter: 'console',
  },
  instrumentation: {
    http: true,
    express: true,
    fs: false,
    dns: false,
    net: false,
    pg: false,
    redis: false,
  },
});
const metricsServer = new MetricsServer(monitoring, METRICS_PORT);

const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: `${SERVICE_NAME}-client`,
  brokers: [process.env['KAFKA_BROKER_URL'] || 'localhost:9092'],
}, logger);

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

// Validation schemas
const nodeSchema = z.object({
  type: z.enum(['institute', 'department', 'researcher']),
  name: z.string().min(1),
  properties: z.record(z.any()).optional(),
});

const relationshipSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  type: z.string().min(1),
  properties: z.record(z.any()).optional(),
});

async function bootstrap() {
  const app = express();
  app.use(express.json());
  // Middleware для метрик будет добавлен позже

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await monitoring.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Create node endpoint
  app.post('/api/graph/nodes', async (req, res) => {
    try {
      const validatedData = nodeSchema.parse(req.body);
      const session = driver.session();
      
      const result = await session.run(
        'CREATE (n:Node {type: $type, name: $name, properties: $properties}) RETURN n',
        {
          type: validatedData.type,
          name: validatedData.name,
          properties: validatedData.properties || {},
        }
      );
      
      const node = result.records[0]?.get('n');
      const nodeId = node?.identity.toString();
      
      // Publish node created event
      await kafkaClient.sendMessage({
        topic: 'graph-events',
        key: nodeId,
        value: {
          eventType: 'node.created',
          nodeId,
          type: validatedData.type,
          name: validatedData.name,
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('Node created successfully', { 
        service: SERVICE_NAME,
        nodeId,
        type: validatedData.type,
        name: validatedData.name 
      } as any);
      
      return res.status(201).json({ 
        message: 'Node created successfully',
        nodeId,
        node: node?.properties 
      });
    } catch (error) {
      logger.error('Failed to create node', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(400).json({ error: 'Failed to create node' });
    }
  });

  // Create relationship endpoint
  app.post('/api/graph/relationships', async (req, res) => {
    try {
      const validatedData = relationshipSchema.parse(req.body);
      const session = driver.session();
      
      const result = await session.run(
        'MATCH (a:Node), (b:Node) WHERE id(a) = $fromId AND id(b) = $toId CREATE (a)-[r:RELATIONSHIP {type: $type, properties: $properties}]->(b) RETURN r',
        {
          fromId: parseInt(validatedData.fromId),
          toId: parseInt(validatedData.toId),
          type: validatedData.type,
          properties: validatedData.properties || {},
        }
      );
      
      const relationship = result.records[0]?.get('r');
      const relationshipId = relationship?.identity.toString();
      
      // Publish relationship created event
      await kafkaClient.sendMessage({
        topic: 'graph-events',
        key: relationshipId,
        value: {
          eventType: 'relationship.created',
          relationshipId,
          fromId: validatedData.fromId,
          toId: validatedData.toId,
          type: validatedData.type,
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('Relationship created successfully', { 
        service: SERVICE_NAME,
        relationshipId,
        fromId: validatedData.fromId,
        toId: validatedData.toId,
        type: validatedData.type 
      } as any);
      
      return res.status(201).json({ 
        message: 'Relationship created successfully',
        relationshipId,
        relationship: relationship?.properties 
      });
    } catch (error) {
      logger.error('Failed to create relationship', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(400).json({ error: 'Failed to create relationship' });
    }
  });

  // Get all nodes endpoint
  app.get('/api/graph/nodes', async (req, res) => {
    try {
      const session = driver.session();
      const result = await session.run('MATCH (n:Node) RETURN n LIMIT 100');
      
      const nodes = result.records.map(record => ({
        id: record.get('n').identity.toString(),
        properties: record.get('n').properties,
      }));
      
      return res.json({ nodes });
    } catch (error) {
      logger.error('Failed to get nodes', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(500).json({ error: 'Failed to get nodes' });
    }
  });

  // Start the server
  const server = app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} listening on port ${PORT}`, {
      service: SERVICE_NAME,
      port: PORT,
      metricsPort: METRICS_PORT,
      environment: process.env['NODE_ENV'] || 'development',
    } as any);
    monitoring['tracingManager'].start();
    metricsServer.start();
    kafkaClient.connect().then(() => logger.info('Kafka producer connected.')).catch(err => logger.error('Failed to connect Kafka producer', { 
      service: SERVICE_NAME,
      error: err.message 
    } as any));
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...', { service: SERVICE_NAME } as any);
    await kafkaClient.disconnect();
    await driver.close();
    metricsServer.stop();
    server.close(() => {
      logger.info('Server closed.', { service: SERVICE_NAME } as any);
      process.exit(0);
    });
  });
}

bootstrap().catch(err => {
  logger.fatal('Failed to bootstrap Graph Service', { 
    service: SERVICE_NAME,
    error: err.message, 
    stack: err.stack 
  } as any);
  process.exit(1);
});