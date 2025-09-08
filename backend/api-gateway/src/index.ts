import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';

const SERVICE_NAME = 'api-gateway';
const PORT = parseInt(process.env['PORT'] || '3001', 10);
const METRICS_PORT = parseInt(process.env['METRICS_PORT'] || '9091', 10);

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

async function bootstrap() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  // Middleware для метрик будет добавлен позже

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.use(limiter);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await monitoring.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Example route to publish a Kafka event
  app.post('/events', async (req, res) => {
    try {
      const { topic, message } = req.body;
      if (!topic || !message) {
        return res.status(400).json({ error: 'Topic and message are required' });
      }
      await kafkaClient.sendMessage({ topic, value: message });
      logger.info('Event published to Kafka', { 
        service: SERVICE_NAME,
        topic, 
        message 
      } as any);
      return res.status(200).json({ status: 'Event published' });
    } catch (error) {
      logger.error('Failed to publish event to Kafka', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(500).json({ error: 'Failed to publish event' });
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
    metricsServer.stop();
    server.close(() => {
      logger.info('Server closed.', { service: SERVICE_NAME } as any);
      process.exit(0);
    });
  });
}

bootstrap().catch(err => {
  logger.fatal('Failed to bootstrap API Gateway', { 
    service: SERVICE_NAME,
    error: err.message, 
    stack: err.stack 
  } as any);
  process.exit(1);
});