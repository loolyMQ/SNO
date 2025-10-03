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
  new client.Counter({
    name: 'backup_service_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [register]
  });

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

  const kafkaClient = createKafkaClient('backup-service');

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.get('/health', (_req, res) => {
    res.json({ 
      service: 'backup-service', 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    });
  });

  app.get('/api/backup/status', (_req, res) => {
    res.json({ 
      service: 'backup-service',
      status: 'operational',
      lastBackup: new Date().toISOString(),
      nextBackup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  });

  return { app, kafkaClient, logger };
}

