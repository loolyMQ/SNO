import { collectDefaultMetrics, register, Counter, Histogram } from 'prom-client';

collectDefaultMetrics({ register });

export const graphOperationsTotal = new Counter({
  name: 'graph_operations_total',
  help: 'Total number of graph operations',
  labelNames: ['operation', 'status']
});

export const graphRequestDuration = new Histogram({
  name: 'graph_request_duration_seconds',
  help: 'Duration of graph requests',
  labelNames: ['operation']
});

export const nodeCount = new Counter({
  name: 'graph_nodes_total',
  help: 'Total number of nodes in graphs',
  labelNames: ['type']
});

export const edgeCount = new Counter({
  name: 'graph_edges_total',
  help: 'Total number of edges in graphs',
  labelNames: ['type']
});

export { register };


