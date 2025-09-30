import { register } from 'prom-client';
import { Topics, EventTypes } from '@science-map/shared';
import { jobsRequestsTotal, jobsRequestDuration, jobsScheduledTotal } from '../metrics';
export function setupHttpMetrics(app) {
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
export function setupRoutes(app, store, kafka, logger) {
    app.get('/health', async (_req, res) => {
        try {
            res.json({ success: true, status: 'healthy', service: 'jobs-service', kafka: kafka.isReady(), jobs: store.stats(), timestamp: Date.now() });
        }
        catch (error) {
            logger.error(`Health check failed: ${error?.message || String(error)}`);
            res.status(500).json({ success: false, status: 'unhealthy', service: 'jobs-service', kafka: false, error: error?.message || 'Unknown error', timestamp: Date.now() });
        }
    });
    app.get('/metrics', async (_req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });
    app.post('/jobs/schedule', async (req, res) => {
        try {
            const { type, payload, priority = 5, maxRetries = 3 } = req.body;
            if (!type)
                return res.status(400).json({ success: false, error: 'type is required' });
            const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const job = { id: jobId, type, payload, status: 'pending', priority, createdAt: Date.now(), retries: 0, maxRetries };
            store.add(job);
            jobsScheduledTotal.inc({ job_type: type });
            await kafka.publish(Topics.JOB_EVENTS, {
                type: EventTypes.JOB_SCHEDULED,
                payload: { jobId, type, userId: payload?.userId || 'anonymous', payload, timestamp: Date.now() },
                correlationId: `job_${jobId}_${Date.now()}`,
                userId: payload?.userId || 'anonymous'
            });
            res.json({ success: true, jobId, status: 'scheduled' });
            return;
        }
        catch (error) {
            logger.error(`Schedule job error: ${error?.message || String(error)}`);
            res.status(500).json({ success: false, error: 'Internal server error' });
            return;
        }
    });
    app.get('/jobs/:jobId', (req, res) => {
        const { jobId } = req.params;
        const job = store.get(jobId);
        if (!job)
            return res.status(404).json({ success: false, error: 'Job not found' });
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
        if (!job)
            return res.status(404).json({ success: false, error: 'Job not found' });
        if (job.status === 'running')
            return res.status(400).json({ success: false, error: 'Cannot cancel running job' });
        store.delete(jobId);
        res.json({ success: true, message: 'Job cancelled' });
        return;
    });
}
//# sourceMappingURL=routes.js.map