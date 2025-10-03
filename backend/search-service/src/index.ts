import './tracing';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { createKafkaClient } from '@science-map/shared';
import client from 'prom-client';
import { z } from 'zod';

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
const PORT = process.env.PORT || 3004;

// Kafka configuration handled by shared factory

app.use(helmet());
app.use(cors());
app.use(express.json());

const kafkaClient = createKafkaClient('search-service');

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestCounter = new client.Counter({
  name: 'search_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequestCounter);

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'search-service',
    timestamp: Date.now(),
  });
});

app.get('/search', (req, res) => {
  const querySchema = z.object({
    q: z.string().min(1,
      { message: 'Query is required' }
    ),
    limit: z.coerce.number().int().min(0).max(100).optional().default(10),
    offset: z.coerce.number().int().min(0).optional().default(0)
  });

  const parseResult = querySchema.safeParse({
    q: req.query.q,
    limit: req.query.limit,
    offset: req.query.offset
  });

  if (!parseResult.success) {
    httpRequestCounter.inc({ method: req.method, route: '/search', status: '400' });
    return res.status(400).json({ success: false, error: 'Invalid query' });
  }

  const { q, limit, offset } = parseResult.data;

  const mockResults = [
    { id: 1, title: 'Computer Science', type: 'field' },
    { id: 2, title: 'Machine Learning', type: 'topic' },
    { id: 3, title: 'Data Structures', type: 'concept' },
  ].filter(item => item.title.toLowerCase().includes(q.toLowerCase()))
   .slice(offset, offset + limit);

  httpRequestCounter.inc({ method: req.method, route: '/search', status: '200' });
  return res.json({
    success: true,
    query: q,
    results: mockResults,
    total: mockResults.length,
    limit,
    offset
  });
});

async function startServer() {
  try {
    await kafkaClient.connect();
    logger.info({
      service: 'search-service',
      action: 'kafka-connect'
    }, 'Search Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'search-service',
        port: PORT,
        action: 'server-start'
      }, 'Search Service running');
    });
  } catch (error) {
    logger.error({
      service: 'search-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Search Service startup error');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();
