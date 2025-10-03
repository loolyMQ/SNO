import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { createKafkaClient } from '@science-map/shared';
import client from 'prom-client';

export function createApp() {
  const app = express();

  // Prometheus metrics
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });
  const httpRequestCounter = new client.Counter({
    name: 'versioning_service_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  });
  register.registerMetric(httpRequestCounter);

  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  const kafkaClient = createKafkaClient('versioning-service');

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.get('/health', (_req, res) => {
    res.json({ 
      service: 'versioning-service', 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    });
  });

  app.get('/api/versions', (_req, res) => {
    res.json({ 
      service: 'versioning-service',
      status: 'operational',
      versions: {
        current: '1.0.0',
        latest: '1.0.0',
        supported: ['1.0.0']
      }
    });
  });

  return { app, kafkaClient, logger };
}

