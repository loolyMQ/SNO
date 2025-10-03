import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { createKafkaClient } from '@science-map/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

const kafkaClient = createKafkaClient('jobs-service');

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'jobs-service',
    timestamp: Date.now(),
  });
});

app.get('/jobs', (_req, res) => {
  const mockJobs = [
    { id: 1, type: 'data-processing', status: 'completed' },
    { id: 2, type: 'report-generation', status: 'running' },
    { id: 3, type: 'backup', status: 'pending' },
  ];
  
  res.json({
    success: true,
    jobs: mockJobs,
  });
});

app.post('/jobs', (req, res) => {
  res.json({
    success: true,
    job: { id: Date.now(), type: req.body.type, status: 'queued' },
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    logger.info({
      service: 'jobs-service',
      action: 'kafka-connect'
    }, 'Jobs Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'jobs-service',
        port: PORT,
        action: 'server-start'
      }, 'Jobs Service running');
    });
  } catch (error) {
    logger.error({
      service: 'jobs-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Jobs Service startup error');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
