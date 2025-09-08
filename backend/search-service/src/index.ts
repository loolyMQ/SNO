import express from 'express';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';
import { MeiliSearch } from 'meilisearch';
import { z } from 'zod';

const SERVICE_NAME = 'search-service';
const PORT = parseInt(process.env['PORT'] || '3005', 10);
const METRICS_PORT = parseInt(process.env['METRICS_PORT'] || '9095', 10);
const MEILI_HOST = process.env['MEILI_HOST'] || 'http://localhost:7700';
const MEILI_API_KEY = process.env['MEILI_API_KEY'] || 'masterKey';

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

const meilisearchClient = new MeiliSearch({
  host: MEILI_HOST,
  apiKey: MEILI_API_KEY,
});

// Validation schemas
const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['paper', 'researcher', 'institute', 'department']),
  metadata: z.record(z.any()).optional(),
});

const searchSchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.any()).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// Index documents
async function indexDocument(document: any) {
  try {
    const index = meilisearchClient.index('documents');
    await index.addDocuments([document]);
    
    logger.info('Document indexed successfully', { 
      service: SERVICE_NAME,
      documentId: document.id,
      type: document.type 
    } as any);
    
    // Publish document indexed event
    await kafkaClient.sendMessage({
      topic: 'search-events',
      key: document.id,
      value: {
        eventType: 'document.indexed',
        documentId: document.id,
        type: document.type,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to index document', { 
      service: SERVICE_NAME,
      documentId: document.id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    } as any);
    throw error;
  }
}

async function bootstrap() {
  const app = express();
  app.use(express.json());
  // Middleware для метрик будет добавлен позже

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await monitoring.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Index document endpoint
  app.post('/api/search/documents', async (req, res) => {
    try {
      const validatedData = documentSchema.parse(req.body);
      
      await indexDocument(validatedData);
      
      return res.status(201).json({ 
        message: 'Document indexed successfully',
        documentId: validatedData.id 
      });
    } catch (error) {
      logger.error('Failed to index document', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(400).json({ error: 'Failed to index document' });
    }
  });

  // Search documents endpoint
  app.post('/api/search', async (req, res) => {
    try {
      const validatedData = searchSchema.parse(req.body);
      
      const index = meilisearchClient.index('documents');
      const results = await index.search(validatedData.query, {
        limit: validatedData.limit || 20,
        offset: validatedData.offset || 0,
        filters: validatedData.filters ? Object.entries(validatedData.filters)
          .map(([key, value]) => `${key} = ${value}`)
          .join(' AND ') : undefined,
      });
      
      // Publish search event
      await kafkaClient.sendMessage({
        topic: 'search-events',
        key: `search_${Date.now()}`,
        value: {
          eventType: 'search.performed',
          query: validatedData.query,
          resultsCount: results.hits.length,
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('Search performed', { 
        service: SERVICE_NAME,
        query: validatedData.query,
        resultsCount: results.hits.length 
      } as any);
      
      return res.json({
        query: validatedData.query,
        hits: results.hits,
        totalHits: results.estimatedTotalHits,
        processingTimeMs: results.processingTimeMs,
      });
    } catch (error) {
      logger.error('Search failed', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(500).json({ error: 'Search failed' });
    }
  });

  // Delete document endpoint
  app.delete('/api/search/documents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const index = meilisearchClient.index('documents');
      await index.deleteDocument(id);
      
      // Publish document deleted event
      await kafkaClient.sendMessage({
        topic: 'search-events',
        key: id,
        value: {
          eventType: 'document.deleted',
          documentId: id,
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('Document deleted', { 
        service: SERVICE_NAME,
        documentId: id 
      } as any);
      
      return res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete document', { 
        service: SERVICE_NAME,
        documentId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(500).json({ error: 'Failed to delete document' });
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
    
    // Kafka consumer will be implemented later
    logger.info('Kafka consumer setup will be implemented later', { service: SERVICE_NAME } as any);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...', { service: SERVICE_NAME } as any);
    await kafkaClient.disconnect();
    metricsServer.stop();
    server.close(() => {
      logger.info('Server closed.', { service: SERVICE_NAME } as any);
      process.exit(0);
    });
  });
}

bootstrap().catch(err => {
  logger.fatal('Failed to bootstrap Search Service', { 
    service: SERVICE_NAME,
    error: err.message, 
    stack: err.stack 
  } as any);
  process.exit(1);
});