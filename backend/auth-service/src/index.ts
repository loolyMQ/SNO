import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { createKafkaClient, ServiceConfig } from '@science-map/shared';

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
const PORT = process.env.PORT || 3003;

const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'auth-service',
    groupId: 'auth-service-group',
  },
};

app.use(helmet());
app.use(cors());
app.use(express.json());

const kafkaClient = createKafkaClient(config);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'auth-service',
    timestamp: Date.now(),
  });
});

app.post('/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'mock-jwt-token',
    user: { id: 1, email: req.body?.email || 'unknown@example.com' },
  });
});

app.post('/auth/register', (req, res) => {
  res.json({
    success: true,
    user: { id: 1, email: req.body?.email || 'unknown@example.com' },
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    logger.info({
      service: 'auth-service',
      action: 'kafka-connect'
    }, 'Auth Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'auth-service',
        port: PORT,
        action: 'server-start'
      }, 'Auth Service running');
    });
  } catch (error) {
    logger.error({
      service: 'auth-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Auth Service startup error');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
