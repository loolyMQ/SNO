import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';

const app = express();
const port = process.env['PORT'] || 3001;
const metricsPort = 9091;

// Инициализация логгера
const logger = new Logger({
  service: 'api-gateway',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация мониторинга
const monitoring = createMonitoring({
  serviceName: 'api-gateway',
  serviceVersion: '0.1.0',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: 'api-gateway',
}, logger);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Too many requests from this IP',
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Мониторинг middleware
app.use(monitoring.middleware.express);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await monitoring.health.checkAll();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
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
      service: 'api-gateway',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// Event publishing endpoint
app.post('/api/events', async (req, res) => {
  try {
    const { topic, event, data } = req.body;
    
    if (!topic || !event || !data) {
      return res.status(400).json({
        error: 'Missing required fields: topic, event, data',
      });
    }

    // Отправляем событие в Kafka
    await kafkaClient.sendMessage({
      topic,
      key: data.id || 'api-gateway',
      value: {
        event,
        data,
        timestamp: new Date().toISOString(),
        source: 'api-gateway',
      },
      headers: {
        'content-type': 'application/json',
        'source': 'api-gateway',
      },
    });

    logger.info('Event published', {
      topic,
      event,
      dataId: data.id,
    });

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
      topic,
      event,
    });
  } catch (error) {
    logger.error('Failed to publish event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });
    
    res.status(500).json({
      error: 'Failed to publish event',
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

    // Запускаем сервер метрик
    const metricsServer = new MetricsServer(metricsPort);
    await metricsServer.start();
    logger.info(`Metrics server started on port ${metricsPort}`);

    // Запускаем основной сервер
    app.listen(port, () => {
      logger.info(`API Gateway server started on port ${port}`, {
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
