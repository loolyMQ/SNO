import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { z } from 'zod';
import { createMetrics } from './metrics';

export function createApp() {
  const app = express();
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } },
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  const { register, httpRequestCounter } = createMetrics();

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

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
    res.json({ success: true, jobs: mockJobs, total: mockJobs.length });
  });

  app.post('/jobs', (req, res) => {
    const jobSchema = z.object({
      type: z.enum(['data-processing', 'report-generation', 'backup']),
      data: z.record(z.unknown())
    });

    const parseResult = jobSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid job data', details: parseResult.error.errors });
    }

    const { type, data } = parseResult.data;
    return res.status(201).json({ success: true, job: { id: Date.now(), type, data, status: 'queued' }, message: 'Job created successfully' });
  });

  return app;
}


