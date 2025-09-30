import { register, collectDefaultMetrics, Counter, Gauge } from 'prom-client';

collectDefaultMetrics({ register });

export const graphRequestsTotal = new Counter({
  name: 'graph_requests_total',
  help: 'Total number of graph requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const graphEventsProcessed = new Counter({
  name: 'graph_events_processed_total',
  help: 'Total number of processed graph events',
  labelNames: ['event_type', 'status'],
  registers: [register]
});

export const graphDataSize = new Gauge({
  name: 'graph_data_size_bytes',
  help: 'Current size of graph data in bytes',
  registers: [register]
});

export const graphNodesCount = new Gauge({
  name: 'graph_nodes_total',
  help: 'Total number of nodes in graph',
  registers: [register]
});

export const graphEdgesCount = new Gauge({
  name: 'graph_edges_total',
  help: 'Total number of edges in graph',
  registers: [register]
});

export { register };

