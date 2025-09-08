import express from 'express';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';

const app = express();
const port = process.env['PORT'] || 3004;
const metricsPort = 9094;

// Инициализация логгера
const logger = new Logger({
  service: 'jobs-service',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация мониторинга
const monitoring = createMonitoring({
  serviceName: 'jobs-service',
  serviceVersion: '0.1.0',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: 'jobs-service',
}, logger);

// Redis подключение
const redis = new IORedis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'],
});

// Создание очередей
const emailQueue = new Queue('email', { connection: redis });
const dataProcessingQueue = new Queue('data-processing', { connection: redis });
const notificationQueue = new Queue('notification', { connection: redis });

// Middleware
app.use(express.json());

// Мониторинг middleware
app.use(monitoring.middleware.express);

// Схемы валидации
const createJobSchema = z.object({
  type: z.enum(['email', 'data-processing', 'notification']),
  data: z.record(z.any()),
  options: z.object({
    delay: z.number().optional(),
    priority: z.number().optional(),
    attempts: z.number().optional(),
  }).optional(),
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await monitoring.health.checkAll();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'jobs-service',
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
      service: 'jobs-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Создание задачи
app.post('/api/jobs', async (req, res) => {
  try {
    const validatedData = createJobSchema.parse(req.body);
    const { type, data, options = {} } = validatedData;

    let queue: Queue;
    switch (type) {
      case 'email':
        queue = emailQueue;
        break;
      case 'data-processing':
        queue = dataProcessingQueue;
        break;
      case 'notification':
        queue = notificationQueue;
        break;
      default:
        return res.status(400).json({
          error: 'Invalid job type',
          message: 'Job type must be one of: email, data-processing, notification',
        });
    }

    const job = await queue.add(type, data, {
      delay: options.delay,
      priority: options.priority,
      attempts: options.attempts || 3,
    });

    // Отправляем событие в Kafka
    await kafkaClient.sendMessage({
      topic: 'job-events',
      key: job.id,
      value: {
        event: 'job.created',
        data: {
          id: job.id,
          type,
          data,
          options,
          createdAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'jobs-service',
      },
      headers: {
        'content-type': 'application/json',
        'source': 'jobs-service',
      },
    });

    logger.info('Job created successfully', {
      jobId: job.id,
      type,
      data,
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job: {
        id: job.id,
        type,
        data,
        options,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Failed to create job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Failed to create job',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Получение статуса задачи
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || !['email', 'data-processing', 'notification'].includes(type as string)) {
      return res.status(400).json({
        error: 'Invalid job type',
        message: 'Job type is required and must be one of: email, data-processing, notification',
      });
    }

    let queue: Queue;
    switch (type) {
      case 'email':
        queue = emailQueue;
        break;
      case 'data-processing':
        queue = dataProcessingQueue;
        break;
      case 'notification':
        queue = notificationQueue;
        break;
    }

    const job = await queue.getJob(id);
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: 'Job with this ID not found',
      });
    }

    res.status(200).json({
      success: true,
      job: {
        id: job.id,
        type,
        data: job.data,
        progress: job.progress,
        state: await job.getState(),
        createdAt: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      },
    });
  } catch (error) {
    logger.error('Failed to get job status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId: req.params.id,
    });

    res.status(500).json({
      error: 'Failed to get job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Получение статистики очередей
app.get('/api/jobs/stats', async (req, res) => {
  try {
    const queues = [
      { name: 'email', queue: emailQueue },
      { name: 'data-processing', queue: dataProcessingQueue },
      { name: 'notification', queue: notificationQueue },
    ];

    const stats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        return {
          name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        };
      })
    );

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get queue stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Failed to get queue stats',
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
    await emailQueue.close();
    await dataProcessingQueue.close();
    await notificationQueue.close();
    await redis.disconnect();
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
    await emailQueue.close();
    await dataProcessingQueue.close();
    await notificationQueue.close();
    await redis.disconnect();
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

    // Создаем топик для событий задач
    await kafkaClient.createTopic('job-events', 3, 1);
    logger.info('Created job-events topic');

    // Создаем воркеры
    const emailWorker = new Worker('email', async (job: Job) => {
      logger.info('Processing email job', { jobId: job.id, data: job.data });
      
      // Симуляция отправки email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Отправляем событие в Kafka
      await kafkaClient.sendMessage({
        topic: 'job-events',
        key: job.id,
        value: {
          event: 'job.completed',
          data: {
            id: job.id,
            type: 'email',
            data: job.data,
            completedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          source: 'jobs-service',
        },
      });
      
      return { success: true, message: 'Email sent successfully' };
    }, { connection: redis });

    const dataProcessingWorker = new Worker('data-processing', async (job: Job) => {
      logger.info('Processing data processing job', { jobId: job.id, data: job.data });
      
      // Симуляция обработки данных
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Отправляем событие в Kafka
      await kafkaClient.sendMessage({
        topic: 'job-events',
        key: job.id,
        value: {
          event: 'job.completed',
          data: {
            id: job.id,
            type: 'data-processing',
            data: job.data,
            completedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          source: 'jobs-service',
        },
      });
      
      return { success: true, message: 'Data processed successfully' };
    }, { connection: redis });

    const notificationWorker = new Worker('notification', async (job: Job) => {
      logger.info('Processing notification job', { jobId: job.id, data: job.data });
      
      // Симуляция отправки уведомления
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Отправляем событие в Kafka
      await kafkaClient.sendMessage({
        topic: 'job-events',
        key: job.id,
        value: {
          event: 'job.completed',
          data: {
            id: job.id,
            type: 'notification',
            data: job.data,
            completedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          source: 'jobs-service',
        },
      });
      
      return { success: true, message: 'Notification sent successfully' };
    }, { connection: redis });

    logger.info('Workers started');

    // Запускаем сервер метрик
    const metricsServer = new MetricsServer(metricsPort);
    await metricsServer.start();
    logger.info(`Metrics server started on port ${metricsPort}`);

    // Запускаем основной сервер
    app.listen(port, () => {
      logger.info(`Jobs service server started on port ${port}`, {
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
