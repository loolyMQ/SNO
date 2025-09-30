import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
collectDefaultMetrics({ register });
register.setDefaultLabels({ app: 'jobs-service' });
export const jobsRequestsTotal = new Counter({
    name: 'jobs_requests_total',
    help: 'Total number of job requests',
    labelNames: ['method', 'route', 'status_code']
});
export const jobsRequestDuration = new Histogram({
    name: 'jobs_request_duration_seconds',
    help: 'Duration of job requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});
export const jobsEventsProcessed = new Counter({
    name: 'jobs_events_processed_total',
    help: 'Total number of job events processed',
    labelNames: ['event_type', 'status']
});
export const jobsActiveTotal = new Gauge({
    name: 'jobs_active_total',
    help: 'Total number of active jobs'
});
export const jobsCompletedTotal = new Counter({
    name: 'jobs_completed_total',
    help: 'Total number of completed jobs',
    labelNames: ['job_type', 'status']
});
export const jobsScheduledTotal = new Counter({
    name: 'jobs_scheduled_total',
    help: 'Total number of scheduled jobs',
    labelNames: ['job_type']
});
export { register };
//# sourceMappingURL=metrics.js.map