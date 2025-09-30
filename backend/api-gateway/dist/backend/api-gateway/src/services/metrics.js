import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';
collectDefaultMetrics({ register });
export const gatewayRequestsTotal = new Counter({
    name: 'gateway_requests_total',
    help: 'Total number of requests through API Gateway',
    labelNames: ['method', 'route', 'service', 'status_code'],
    registers: [register]
});
export const gatewayRequestDuration = new Histogram({
    name: 'gateway_request_duration_seconds',
    help: 'Duration of gateway requests in seconds',
    labelNames: ['method', 'route', 'service'],
    registers: [register]
});
export const serviceHealthStatus = new Counter({
    name: 'service_health_status',
    help: 'Health status of backend services',
    labelNames: ['service', 'status'],
    registers: [register]
});
export { register };
//# sourceMappingURL=metrics.js.map