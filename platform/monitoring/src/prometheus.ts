import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export class PrometheusMetrics {
  private static instance: PrometheusMetrics;
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private activeConnections: Gauge<string>;
  private memoryUsage: Gauge<string>;

  private constructor() {
    // Собираем стандартные метрики
    collectDefaultMetrics({ register });

    // HTTP метрики
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // Системные метрики
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections'
    });

    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    // Регистрируем метрики
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.memoryUsage);
  }

  public static getInstance(): PrometheusMetrics {
    if (!PrometheusMetrics.instance) {
      PrometheusMetrics.instance = new PrometheusMetrics();
    }
    return PrometheusMetrics.instance;
  }

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
    
    this.httpRequestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  }

  public setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  public setMemoryUsage(type: string, bytes: number): void {
    this.memoryUsage.labels(type).set(bytes);
  }

  public getMetrics(): Promise<string> {
    return register.metrics();
  }
}
