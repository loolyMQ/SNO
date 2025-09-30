import { Counter, Gauge, Histogram } from 'prom-client';
export const poolConnectionsTotal = new Gauge({
    name: 'pool_connections_total',
    help: 'Total number of connections in pool',
    labelNames: ['pool_type', 'pool_name', 'status'],
});
export const poolConnectionsActive = new Gauge({
    name: 'pool_connections_active',
    help: 'Number of active connections in pool',
    labelNames: ['pool_type', 'pool_name'],
});
export const poolConnectionsIdle = new Gauge({
    name: 'pool_connections_idle',
    help: 'Number of idle connections in pool',
    labelNames: ['pool_type', 'pool_name'],
});
export const poolOperationsTotal = new Counter({
    name: 'pool_operations_total',
    help: 'Total number of pool operations',
    labelNames: ['pool_type', 'pool_name', 'operation', 'status'],
});
export const poolConnectionDuration = new Histogram({
    name: 'pool_connection_duration_seconds',
    help: 'Duration of pool connections',
    labelNames: ['pool_type', 'pool_name'],
});
export const poolWaitingConnections = new Gauge({
    name: 'pool_waiting_connections',
    help: 'Number of connections waiting in queue',
    labelNames: ['pool_type', 'pool_name'],
});
//# sourceMappingURL=metrics.js.map