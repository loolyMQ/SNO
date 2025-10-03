import client from 'prom-client';

export interface Metrics {
  register: client.Registry;
  httpRequestCounter: client.Counter<string>;
}

export function createMetrics(): Metrics {
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  const httpRequestCounter = new client.Counter({
    name: 'jobs_service_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  });

  register.registerMetric(httpRequestCounter);
  return { register, httpRequestCounter };
}




