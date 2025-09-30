import express from 'express';
import { register } from 'prom-client';
import { Topics, EventTypes, IKafkaMessage } from '@science-map/shared';
import { jobsRequestsTotal, jobsRequestDuration, jobsScheduledTotal } from '../metrics';
import { InMemoryJobStore } from '../jobs/store';
import { Job } from '../jobs/types';

export function setupHttpMetrics(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      jobsRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode.toString() });
      jobsRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
    });
    next();
  });
}

export function setupRoutes(app: express.Application, store: InMemoryJobStore, kafka: { publish: (topic: string, msg: IKafkaMessage) => Promise<void>; isReady: () => boolean }, logger: { info: (msg: string | object, ...args: any[]) => void; error: (msg: string | object, ...args: any[]) => void }) {
  app.get('/health', async (_req, res) => {
    try {
      res.json({ success: true, status: 'healthy', service: 'jobs-service', kafka: kafka.isReady(), jobs: store.stats(), timestamp: Date.now() });
    } catch (error) {
      logger.error(`Health check failed: ${(error as Error)?.message || String(error)}`);
      res.status(500).json({ success: false, status: 'unhealthy', service: 'jobs-service', kafka: false, error: (error as Error)?.message || 'Unknown error', timestamp: Date.now() });
    }
  });

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.post('/jobs/schedule', async (req, res) => {
    try {
      const { type, payload, priority = 5, maxRetries = 3 } = req.body as { type: string; payload: Record<string, unknown>; priority?: number; maxRetries?: number };
      if (!type) return res.status(400).json({ success: false, error: 'type is required' });
      const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const job: Job = { id: jobId, type, payload, status: 'pending', priority, createdAt: Date.now(), retries: 0, maxRetries };
      store.add(job);
      jobsScheduledTotal.inc({ job_type: type });
      await kafka.publish(Topics.JOB_EVENTS, { 
        type: EventTypes.JOB_SCHEDULED, 
        payload: { jobId, type, userId: (payload as any)?.userId || 'anonymous', payload, timestamp: Date.now() },
        correlationId: `job_${jobId}_${Date.now()}`,
        userId: (payload as any)?.userId || 'anonymous'
      } as any);
      res.json({ success: true, jobId, status: 'scheduled' });
      return;
    } catch (error) {
      logger.error(`Schedule job error: ${(error as Error)?.message || String(error)}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
      return;
    }
  });

  app.get('/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = store.get(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, job: { id: job.id, type: job.type, status: job.status, priority: job.priority, createdAt: job.createdAt, startedAt: job.startedAt, completedAt: job.completedAt, retries: job.retries, maxRetries: job.maxRetries, error: job.error, result: job.result } });
    return;
  });

  app.get('/jobs', (_req, res) => {
    const allJobs = store.allMinimal();
    res.json({ success: true, jobs: allJobs, total: allJobs.length, queueSize: store.stats().queueSize });
    return;
  });

  app.delete('/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = store.get(jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.status === 'running') return res.status(400).json({ success: false, error: 'Cannot cancel running job' });
    store.delete(jobId);
    res.json({ success: true, message: 'Job cancelled' });
    return;
  });
}


