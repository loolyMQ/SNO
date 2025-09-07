import { register, collectDefaultMetrics, Counter, Gauge, Histogram, Summary } from 'prom-client';
import { MonitoringConfig, MetricLabels } from '../types';

export class MetricsCollector {
  private config: MonitoringConfig;
  private customMetrics: Map<string, Counter | Gauge | Histogram | Summary> = new Map();

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics(): void {
    if (this.config.metrics.collectDefaultMetrics) {
      collectDefaultMetrics({
        register,
        prefix: `${this.config.serviceName}_`,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      });
    }
  }

  // Создание кастомных метрик
  createCounter(name: string, help: string, labels?: string[]): Counter {
    const counter = new Counter({
      name: `${this.config.serviceName}_${name}`,
      help,
      labelNames: labels,
      registers: [register],
    });
    
    this.customMetrics.set(name, counter);
    return counter;
  }

  createGauge(name: string, help: string, labels?: string[]): Gauge {
    const gauge = new Gauge({
      name: `${this.config.serviceName}_${name}`,
      help,
      labelNames: labels,
      registers: [register],
    });
    
    this.customMetrics.set(name, gauge);
    return gauge;
  }

  createHistogram(name: string, help: string, labels?: string[], buckets?: number[]): Histogram {
    const histogram = new Histogram({
      name: `${this.config.serviceName}_${name}`,
      help,
      labelNames: labels,
      buckets: buckets || [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });
    
    this.customMetrics.set(name, histogram);
    return histogram;
  }

  createSummary(name: string, help: string, labels?: string[]): Summary {
    const summary = new Summary({
      name: `${this.config.serviceName}_${name}`,
      help,
      labelNames: labels,
      registers: [register],
    });
    
    this.customMetrics.set(name, summary);
    return summary;
  }

  // Получение метрики по имени
  getMetric(name: string): Counter | Gauge | Histogram | Summary | undefined {
    return this.customMetrics.get(name);
  }

  // Увеличение счетчика
  incrementCounter(name: string, labels?: MetricLabels, value: number = 1): void {
    const metric = this.customMetrics.get(name) as Counter;
    if (metric) {
      metric.inc(labels || {}, value);
    }
  }

  // Установка значения gauge
  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const metric = this.customMetrics.get(name) as Gauge;
    if (metric) {
      metric.set(labels || {}, value);
    }
  }

  // Запись в histogram
  observeHistogram(name: string, value: number, labels?: MetricLabels): void {
    const metric = this.customMetrics.get(name) as Histogram;
    if (metric) {
      metric.observe(labels || {}, value);
    }
  }

  // Запись в summary
  observeSummary(name: string, value: number, labels?: MetricLabels): void {
    const metric = this.customMetrics.get(name) as Summary;
    if (metric) {
      metric.observe(labels || {}, value);
    }
  }

  // Получение всех метрик в формате Prometheus
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Очистка всех метрик
  clear(): void {
    register.clear();
    this.customMetrics.clear();
    this.initializeDefaultMetrics();
  }

  // Получение метрик в JSON формате
  async getMetricsAsJSON(): Promise<any> {
    return register.getMetricsAsJSON();
  }
}

// Предустановленные метрики для HTTP запросов
export class HttpMetrics {
  private metricsCollector: MetricsCollector;
  
  public requestDuration!: Histogram;
  public requestTotal!: Counter;
  public activeRequests!: Gauge;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
    this.initializeHttpMetrics();
  }

  private initializeHttpMetrics(): void {
    this.requestDuration = this.metricsCollector.createHistogram(
      'http_request_duration_seconds',
      'Duration of HTTP requests in seconds',
      ['method', 'route', 'status_code']
    );

    this.requestTotal = this.metricsCollector.createCounter(
      'http_requests_total',
      'Total number of HTTP requests',
      ['method', 'route', 'status_code']
    );

    this.activeRequests = this.metricsCollector.createGauge(
      'http_active_requests',
      'Number of active HTTP requests',
      ['method', 'route']
    );
  }

  recordRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.requestDuration.observe(labels, duration);
    this.requestTotal.inc(labels);
  }

  incrementActiveRequests(method: string, route: string): void {
    this.activeRequests.inc({ method, route });
  }

  decrementActiveRequests(method: string, route: string): void {
    this.activeRequests.dec({ method, route });
  }
}

// Предустановленные метрики для базы данных
export class DatabaseMetrics {
  private metricsCollector: MetricsCollector;
  
  public queryDuration!: Histogram;
  public queryTotal!: Counter;
  public connectionPool!: Gauge;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
    this.initializeDatabaseMetrics();
  }

  private initializeDatabaseMetrics(): void {
    this.queryDuration = this.metricsCollector.createHistogram(
      'database_query_duration_seconds',
      'Duration of database queries in seconds',
      ['operation', 'table']
    );

    this.queryTotal = this.metricsCollector.createCounter(
      'database_queries_total',
      'Total number of database queries',
      ['operation', 'table', 'status']
    );

    this.connectionPool = this.metricsCollector.createGauge(
      'database_connection_pool_size',
      'Number of connections in the pool',
      ['state']
    );
  }

  recordQuery(operation: string, table: string, duration: number, status: 'success' | 'error'): void {
    const labels = { operation, table, status };
    
    this.queryDuration.observe(labels, duration);
    this.queryTotal.inc(labels);
  }

  updateConnectionPool(state: 'active' | 'idle' | 'total', count: number): void {
    this.connectionPool.set({ state }, count);
  }
}
