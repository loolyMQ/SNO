import express from 'express';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import prisma from './prisma';

const SERVICE_NAME = 'jobs-service';
const PORT = parseInt(process.env['PORT'] || '3004', 10);
const METRICS_PORT = parseInt(process.env['METRICS_PORT'] || '9094', 10);
const REDIS_HOST = process.env['REDIS_HOST'] || 'localhost';
const REDIS_PORT = parseInt(process.env['REDIS_PORT'] || '6379', 10);

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

const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

const emailQueue = new Queue('email-queue', { connection });
const dataProcessingQueue = new Queue('data-processing-queue', { connection });

// Validation schemas
const emailJobSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  priority: z.number().min(1).max(10).optional(),
});

const dataProcessingJobSchema = z.object({
  dataId: z.string().min(1),
  operation: z.enum(['analyze', 'transform', 'validate']),
  parameters: z.record(z.any()).optional(),
});

// Helper function to create job in database
async function createJobInDatabase(
  name: string,
  type: 'EMAIL_SEND' | 'DATA_PROCESSING' | 'REPORT_GENERATION' | 'CLEANUP' | 'BACKUP' | 'SYNC' | 'CUSTOM',
  data: any,
  priority: number = 0
) {
  return await prisma.job.create({
    data: {
      name,
      type,
      data,
      priority,
      status: 'PENDING',
    },
  });
}

// Workers
const emailWorker = new Worker('email-queue', async (job: Job) => {
  logger.info('Processing email job', { 
    service: SERVICE_NAME,
    jobId: job.id,
    to: job.data.to 
  } as any);
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Publish job completed event
  await kafkaClient.sendMessage({
    topic: 'job-events',
    key: job.id?.toString(),
    value: {
      eventType: 'job.completed',
      jobId: job.id,
      jobType: 'email',
      status: 'completed',
      timestamp: new Date().toISOString(),
    },
  });
  
  return { success: true, messageId: `msg_${Date.now()}` };
}, { connection });

const dataProcessingWorker = new Worker('data-processing-queue', async (job: Job) => {
  logger.info('Processing data job', { 
    service: SERVICE_NAME,
    jobId: job.id,
    operation: job.data.operation 
  } as any);
  
  // Simulate data processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Publish job completed event
  await kafkaClient.sendMessage({
    topic: 'job-events',
    key: job.id?.toString(),
    value: {
      eventType: 'job.completed',
      jobId: job.id,
      jobType: 'data-processing',
      operation: job.data.operation,
      status: 'completed',
      timestamp: new Date().toISOString(),
    },
  });
  
  return { success: true, processedData: job.data.dataId };
}, { connection });

async function bootstrap() {
  const app = express();
  app.use(express.json());
  // Middleware для метрик будет добавлен позже

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await monitoring.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Create email job endpoint
  app.post('/api/jobs/email', async (req, res) => {
    try {
      const validatedData = emailJobSchema.parse(req.body);
      
      // Create job in database
      const dbJob = await createJobInDatabase(
        'Send Email',
        'EMAIL_SEND',
        {
          to: validatedData.to,
          subject: validatedData.subject,
          body: validatedData.body,
        },
        validatedData.priority || 5
      );
      
      // Add to BullMQ queue
      const queueJob = await emailQueue.add('send-email', {
        dbJobId: dbJob.id,
        to: validatedData.to,
        subject: validatedData.subject,
        body: validatedData.body,
        priority: validatedData.priority || 5,
      });
      
      // Update database job with queue job ID
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { 
          status: 'ACTIVE',
          data: {
            ...dbJob.data as any,
            queueJobId: queueJob.id,
          }
        },
      });
      
      // Publish job created event
      await kafkaClient.sendMessage({
        topic: 'job-events',
        key: dbJob.id,
        value: {
          eventType: 'job.created',
          jobId: dbJob.id,
          queueJobId: queueJob.id,
          jobType: 'email',
          status: 'queued',
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('Email job created', { 
        service: SERVICE_NAME,
        jobId: dbJob.id,
        queueJobId: queueJob.id,
        to: validatedData.to 
      } as any);
      
      return res.status(201).json({ 
        message: 'Email job created successfully',
        jobId: dbJob.id,
        queueJobId: queueJob.id
      });
    } catch (error) {
      logger.error('Failed to create email job', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(400).json({ error: 'Failed to create email job' });
    }
  });

  // Create data processing job endpoint
  app.post('/api/jobs/data-processing', async (req, res) => {
    try {
      const validatedData = dataProcessingJobSchema.parse(req.body);
      
      // Create job in database
      const dbJob = await createJobInDatabase(
        'Data Processing',
        'DATA_PROCESSING',
        {
          dataId: validatedData.dataId,
          operation: validatedData.operation,
          parameters: validatedData.parameters || {},
        },
        5
      );
      
      // Add to BullMQ queue
      const queueJob = await dataProcessingQueue.add('process-data', {
        dbJobId: dbJob.id,
        dataId: validatedData.dataId,
        operation: validatedData.operation,
        parameters: validatedData.parameters || {},
      });
      
      // Update database job with queue job ID
      await prisma.job.update({
        where: { id: dbJob.id },
        data: { 
          status: 'ACTIVE',
          data: {
            ...dbJob.data as any,
            queueJobId: queueJob.id,
          }
        },
      });
      
      // Publish job created event
      await kafkaClient.sendMessage({
        topic: 'job-events',
        key: dbJob.id,
        value: {
          eventType: 'job.created',
          jobId: dbJob.id,
          queueJobId: queueJob.id,
          jobType: 'data-processing',
          operation: validatedData.operation,
          status: 'queued',
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('Data processing job created', { 
        service: SERVICE_NAME,
        jobId: dbJob.id,
        queueJobId: queueJob.id,
        operation: validatedData.operation 
      } as any);
      
      return res.status(201).json({ 
        message: 'Data processing job created successfully',
        jobId: dbJob.id,
        queueJobId: queueJob.id
      });
    } catch (error) {
      logger.error('Failed to create data processing job', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(400).json({ error: 'Failed to create data processing job' });
    }
  });

  // Get job status endpoint
  app.get('/api/jobs/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // Get job from database
      const dbJob = await prisma.job.findUnique({
        where: { id: jobId },
        include: { logs: true },
      });
      
      if (!dbJob) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Get queue job status if available
      let queueJobStatus = null;
      if (dbJob.data && (dbJob.data as any).queueJobId) {
        const queueJobId = (dbJob.data as any).queueJobId;
        const emailJob = await emailQueue.getJob(queueJobId);
        const dataJob = await dataProcessingQueue.getJob(queueJobId);
        const queueJob = emailJob || dataJob;
        
        if (queueJob) {
          queueJobStatus = {
            status: await queueJob.getState(),
            progress: queueJob.progress,
            result: queueJob.returnvalue,
          };
        }
      }
      
      return res.json({
        jobId: dbJob.id,
        name: dbJob.name,
        type: dbJob.type,
        status: dbJob.status,
        priority: dbJob.priority,
        data: dbJob.data,
        result: dbJob.result,
        error: dbJob.error,
        attempts: dbJob.attempts,
        maxAttempts: dbJob.maxAttempts,
        createdAt: dbJob.createdAt,
        updatedAt: dbJob.updatedAt,
        startedAt: dbJob.startedAt,
        completedAt: dbJob.completedAt,
        logs: dbJob.logs,
        queueStatus: queueJobStatus,
      });
    } catch (error) {
      logger.error('Failed to get job status', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(500).json({ error: 'Failed to get job status' });
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
    await emailQueue.close();
    await dataProcessingQueue.close();
    await connection.disconnect();
    await prisma.$disconnect();
    metricsServer.stop();
    server.close(() => {
      logger.info('Server closed.', { service: SERVICE_NAME } as any);
      process.exit(0);
    });
  });
}

bootstrap().catch(err => {
  logger.fatal('Failed to bootstrap Jobs Service', { 
    service: SERVICE_NAME,
    error: err.message, 
    stack: err.stack 
  } as any);
  process.exit(1);
});