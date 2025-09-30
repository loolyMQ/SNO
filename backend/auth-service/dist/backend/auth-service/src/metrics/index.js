import { Counter, Gauge, Histogram } from 'prom-client';
export const authOperationsTotal = new Counter({
    name: 'auth_operations_total',
    help: 'Total number of auth operations',
    labelNames: ['operation', 'status']
});
export const authRequestDuration = new Histogram({
    name: 'auth_request_duration_seconds',
    help: 'Duration of auth requests',
    labelNames: ['operation']
});
export const activeUsers = new Gauge({
    name: 'auth_active_users',
    help: 'Number of active users'
});
export const tokensIssued = new Counter({
    name: 'auth_tokens_issued_total',
    help: 'Total number of tokens issued',
    labelNames: ['type']
});
export const tokenValidationDuration = new Histogram({
    name: 'auth_token_validation_duration_seconds',
    help: 'Duration of token validation'
});
//# sourceMappingURL=index.js.map