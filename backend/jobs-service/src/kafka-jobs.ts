import express from 'express';
import pino from 'pino';
import http from 'http';
import { register } from 'prom-client';
import { z } from 'zod';
import * as cron from 'node-cron';
import { 
  createKafkaClient, 
  EventTypes, 
  Topics, 
  IKafkaMessage,
  CommonMiddleware
} from '@science-map/shared';

import { jobsRequestsTotal, jobsRequestDuration, jobsEventsProcessed, jobsActiveTotal, jobsCompletedTotal, jobsScheduledTotal } from './metrics';

const logger = pino({
  level: (process.env['LOG_LEVEL'] as string) || 'info',
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
const PORT = Number(process.env['PORT'] || 3006);

const kafkaClient = createKafkaClient('jobs-service');

register.setDefaultLabels({ app: 'jobs-service' });

 

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    jobsRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString()
    });

    jobsRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
  });

  next();
});

const commonMiddleware = CommonMiddleware.create(logger as any);
commonMiddleware.setupAll(app, 'jobs-service', {
  cors: {
    origin: (process.env['FRONTEND_URL'] as string) || 'http://localhost:3000',
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  logging: {
    level: (process.env['LOG_LEVEL'] as string) || 'info'
  }
});

import { Job, JobTypes } from './jobs/types';

import { InMemoryJobStore } from './jobs/store';
const store = new InMemoryJobStore();

 

import { createJobProcessors } from './jobs/processors';
const jobProcessors = createJobProcessors(logger);

const processJob = async (jobId: string): Promise<void> => {
  const job = store.get(jobId);
  if (!job || job.status !== 'pending') {
    return;
  }

  job.status = 'running';
  job.startedAt = Date.now();
  jobsActiveTotal.inc();

  try {
    const processor = (jobProcessors as any)[job.type] as (j: Job) => Promise<unknown>;
    if (!processor) {
      throw new Error(`No processor found for job type: ${job.type}`);
    }

    logger.info(`⚡ Starting job ${job.id} (${job.type})`);
    const result = await processor(job);

    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;

    jobsCompletedTotal.inc({ job_type: job.type, status: 'success' });
    jobsActiveTotal.dec();

    logger.info(`✅ Job ${job.id} completed successfully`);

    
    await kafkaClient.publish(Topics.JOB_EVENTS, {
      type: EventTypes.JOB_COMPLETED,
      payload: {
        jobId: job.id,
        type: job.type,
        result,
        duration: (job.completedAt as number) - (job.startedAt as number),
        timestamp: Date.now(),
      }
    });

  } catch (error: unknown) {
    job.retries++;
    jobsActiveTotal.dec();

    if (job.retries >= job.maxRetries) {
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = error instanceof Error ? error.message : String(error);
      jobsCompletedTotal.inc({ job_type: job.type, status: 'failed' });
      logger.error(`Job ${job.id} failed permanently: ${(error as Error)?.message || String(error)}`);
    } else {
      job.status = 'pending';
      store.add(job);
      logger.warn(`Job ${job.id} failed, retrying (${job.retries}/${job.maxRetries}): ${(error as Error)?.message || String(error)}`);
    }
  }
};

const processQueue = async (): Promise<void> => {
  const jobId = store.next();
  if (jobId) {
    await processJob(jobId);
  }
};

cron.schedule('*/5 * * * * *', processQueue);

cron.schedule('0 * * * *', async () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleanedCount = 0;

  for (const jobId of (store as any)['jobs'].keys()) {
    const job = store.get(jobId)!;
    if ((job.status === 'completed' || job.status === 'failed') && 
        job.completedAt && job.completedAt < oneHourAgo) {
      store.delete(jobId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info(`🧹 Cleaned up ${cleanedCount} old jobs`);
  }
});

const scheduleJobSchema = z.object({
  type: z.string().min(1),
  payload: z.any(),
  priority: z.number().min(1).max(10).optional().default(5),
  maxRetries: z.number().min(0).max(5).optional().default(3),
});

const eventHandlers: Record<string, (message: IKafkaMessage) => Promise<void>> = {
  [EventTypes.USER_REGISTERED]: async (message: IKafkaMessage) => {
    try {
      const event = message.payload as { userId: string; email: string; name: string };
      logger.info(`👤 Scheduling onboarding job for user: ${event.userId}`);
      
      
      const jobId = `onboarding-${event.userId}-${Date.now()}`;
      const job: Job = {
        id: jobId,
        type: JobTypes.USER_ONBOARDING,
        payload: {
          userId: event.userId,
          email: event.email,
          name: event.name,
        },
        status: 'pending',
        priority: 8, 
        createdAt: Date.now(),
        retries: 0,
        maxRetries: 3,
      };

      store.add(job);
      jobsScheduledTotal.inc({ job_type: job.type });

      logger.info(`✅ Onboarding job scheduled: ${jobId}`);
      jobsEventsProcessed.inc({ event_type: 'user_registered', status: 'success' });

    } catch (error) {
      logger.error(`Error handling USER_REGISTERED: ${(error as Error)?.message || String(error)}`);
      jobsEventsProcessed.inc({ event_type: 'user_registered', status: 'error' });
    }
  },

  
};

app.get('/health', async (_req, res) => {
  try {
    const kafkaStatus = kafkaClient.isReady();
    
    res.json({
      success: true,
      status: 'healthy',
      service: 'jobs-service',
      kafka: kafkaStatus,
      jobs: store.stats(),
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    logger.error(`Health check failed: ${(error as Error)?.message || String(error)}`);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      service: 'jobs-service',
      kafka: false,
      error: (error as Error)?.message || 'Unknown error',
      timestamp: Date.now(),
    });
  }
});

// removed /kafka/health endpoint (unsupported in current Kafka client API)

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.post('/jobs/schedule', async (req, res) => {
  try {
    const validation = scheduleJobSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { type, payload, priority, maxRetries } = validation.data;
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const job: Job = {
      id: jobId,
      type,
      payload,
      status: 'pending',
      priority,
      createdAt: Date.now(),
      retries: 0,
      maxRetries,
    };

    store.add(job);
    jobsScheduledTotal.inc({ job_type: type });

    
    await kafkaClient.publish(Topics.JOB_EVENTS, {
      type: EventTypes.JOB_SCHEDULED,
      payload: {
        jobId,
        type,
        userId: (payload as any).userId || 'anonymous',
        payload,
        timestamp: Date.now(),
      }
    });

    res.json({
      success: true,
      jobId,
      status: 'scheduled',
    });
    return;
  } catch (error: unknown) {
    logger.error(`Schedule job error: ${(error as Error)?.message || String(error)}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }
});

app.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = store.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
    });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      retries: job.retries,
      maxRetries: job.maxRetries,
      error: job.error,
      result: job.result,
    },
  });
  return;
});

app.get('/jobs', (_req, res) => {
const allJobs = store.allMinimal();

  res.json({
    success: true,
    jobs: allJobs,
    total: allJobs.length,
    queueSize: store.stats().queueSize,
  });
  return;
});

app.delete('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = store.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found',
    });
  }

  if (job.status === 'running') {
    return res.status(400).json({
      success: false,
      error: 'Cannot cancel running job',
    });
  }

  store.delete(jobId);

  res.json({
    success: true,
    message: 'Job cancelled',
  });
  return;
});

app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    timestamp: Date.now(),
  });
});

let server: http.Server;

try {
  server = app.listen(PORT, () => {
    logger.info({
      service: 'jobs-service',
      port: PORT,
      environment: (process.env['NODE_ENV'] as string) || 'development'
    }, 'Jobs Service started successfully');
  });
} catch (error: unknown) {
  logger.error({
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : 'Unknown',
    port: PORT
  }, '❌ Failed to start Jobs Service');
  process.exit(1);
}

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal, pid: process.pid }, 'Starting graceful shutdown');

  
  // No global destroy in node-cron types; tasks are stopped elsewhere

  if (!server) {
    logger.error('❌ Server not initialized, forcing exit');
    process.exit(1);
  }

  server.close(() => {
    logger.info('HTTP server closed successfully');
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  
  try {
    await kafkaClient.disconnect();
    logger.info('✅ Kafka client disconnected');
  } catch (error) {
    logger.error(`Error during Kafka client disconnect: ${(error as Error)?.message || String(error)}`);
  }

  setTimeout(() => {
  logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    name: err.name,
    cause: err.cause
  }, '💥 Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    reason: reason,
    promise: promise,
    stack: reason instanceof Error ? reason.stack : undefined
  }, '💥 Unhandled Rejection');
  gracefulShutdown('unhandledRejection');
});

(async () => {
  try {
    await kafkaClient.connect();
    logger.info('🎯 Jobs Service Kafka initialized successfully');
    await kafkaClient.subscribe([Topics.AUTH_EVENTS], eventHandlers);
    
    
    jobsActiveTotal.set(store.stats().running);
  } catch (error) {
    logger.error(`Jobs Service startup error: ${(error as Error)?.message || String(error)}`);
    process.exit(1);
  }
})();
