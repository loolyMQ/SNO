import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import client from 'prom-client';
import { z } from 'zod';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

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
      q: z.string().min(1, { message: 'Query is required' }),
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

  return app;
}


