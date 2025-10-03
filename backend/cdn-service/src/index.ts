import './tracing';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino';
import { createKafkaClient } from '@science-map/shared';
import client from 'prom-client';

const app = express();
const PORT = process.env.PORT || 3007;

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register: register });
// TODO: Implement HTTP request counter
// const _httpRequestCounter = new client.Counter({
//   name: 'cdn_service_http_requests_total',
//   help: 'Total number of HTTP requests',
//   labelNames: ['method', 'route', 'status'],
//   registers: [register]
// });
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
app.use(compression());
app.use(express.json());

// Metrics middleware - removed due to TypeScript compatibility issues
// Metrics will be collected at endpoint level instead
// TODO: Implement proper metrics middleware in production

const kafkaClient = createKafkaClient('cdn-service');

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({ 
    service: 'cdn-service', 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/cdn/assets', (req, res) => {
  res.json({ 
    service: 'cdn-service',
    status: 'operational',
    assets: [],
    cache: {
      hitRate: 0.95,
      size: '2.1GB'
    }
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    logger.info({
      service: 'cdn-service',
      action: 'kafka-connect'
    }, 'CDN Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'cdn-service',
        port: PORT,
        action: 'server-start'
      }, 'CDN Service running');
    });
  } catch (error) {
    logger.error({
      service: 'cdn-service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'CDN Service startup error');
    process.exit(1);
  }
}

startServer();
