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
  client.collectDefaultMetrics({ register: register });
  const httpRequestCounter = new client.Counter({
    name: 'secrets_service_http_requests_total',
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

  const kafkaClient = createKafkaClient('secrets-service');

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.get('/health', (_req, res) => {
    res.json({ 
      service: 'secrets-service', 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    });
  });

  app.get('/api/secrets', (_req, res) => {
    res.json({ 
      service: 'secrets-service',
      status: 'operational',
      secrets: {
        count: 0,
        lastRotated: new Date().toISOString()
      }
    });
  });

  return { app, kafkaClient, logger };
}

