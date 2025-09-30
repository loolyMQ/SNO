import { ResourceMonitor, ResourceMetrics } from './resource-monitor';
import { Gauge, Counter, Histogram } from 'prom-client';

export interface PerformanceMetrics {
  throughput: {
    requestsPerSecond: number;
    errorsPerSecond: number;
    averageResponseTime: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errors: {
    rate: number;
    types: Record<string, number>;
  };
  resources: ResourceMetrics;
}

export class PerformanceMonitor {
  private resourceMonitor: ResourceMonitor;
  private throughputGauge: Gauge<string>;
  private latencyHistogram: Histogram<string>;
  private errorRateGauge: Gauge<string>;
  private queueSizeGauge: Gauge<string>;
  private cacheHitRateGauge: Gauge<string>;
  private databaseQueryCounter: Counter<string>;
  private databaseQueryHistogram: Histogram<string>;

  private requestTimes: number[] = [];
  private errorCounts: Record<string, number> = {};
  private lastUpdateTime: number = Date.now();
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor(serviceName: string) {
    this.resourceMonitor = new ResourceMonitor(serviceName);

    this.throughputGauge = new Gauge({
      name: `${serviceName}_throughput_rps`,
      help: 'Requests per second',
      labelNames: ['type'],
    });

    this.latencyHistogram = new Histogram({
      name: `${serviceName}_latency_seconds`,
      help: 'Request latency in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.errorRateGauge = new Gauge({
      name: `${serviceName}_error_rate`,
      help: 'Error rate percentage',
      labelNames: ['type'],
    });

    this.queueSizeGauge = new Gauge({
      name: `${serviceName}_queue_size`,
      help: 'Queue size',
      labelNames: ['queue'],
    });

    this.cacheHitRateGauge = new Gauge({
      name: `${serviceName}_cache_hit_rate`,
      help: 'Cache hit rate percentage',
      labelNames: ['cache'],
    });

    this.databaseQueryCounter = new Counter({
      name: `${serviceName}_database_queries_total`,
      help: 'Total database queries',
      labelNames: ['operation', 'table', 'status'],
    });

    this.databaseQueryHistogram = new Histogram({
      name: `${serviceName}_database_query_duration_seconds`,
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.startPerformanceTracking();
  }

  private startPerformanceTracking(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 10000);
  }

  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const timeDiff = (now - this.lastUpdateTime) / 1000;

    if (timeDiff > 0) {
      const rps = this.requestCount / timeDiff;
      const eps = this.errorCount / timeDiff;
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

      this.throughputGauge.labels({ type: 'requests' }).set(rps);
      this.throughputGauge.labels({ type: 'errors' }).set(eps);
      this.errorRateGauge.labels({ type: 'overall' }).set(errorRate);

      Object.entries(this.errorCounts).forEach(([type, count]) => {
        const typeErrorRate = this.requestCount > 0 ? (count / this.requestCount) * 100 : 0;
        this.errorRateGauge.labels({ type }).set(typeErrorRate);
      });
    }

    this.requestCount = 0;
    this.errorCount = 0;
    this.errorCounts = {};
    this.lastUpdateTime = now;
  }

  public recordRequest(duration: number, operation: string = 'request'): void {
    this.requestCount++;
    this.requestTimes.push(duration);

    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }

    this.latencyHistogram.labels({ operation }).observe(duration);
  }

  public recordError(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    this.errorCount++;
    this.errorCounts[type] = (this.errorCounts[type] || 0) + 1;
    this.resourceMonitor.recordError(type, severity);
  }

  public recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    this.databaseQueryCounter.labels({ operation, table, status }).inc();
    this.databaseQueryHistogram.labels({ operation, table }).observe(duration);
  }

  public setQueueSize(queueName: string, size: number): void {
    this.queueSizeGauge.labels({ queue: queueName }).set(size);
  }

  public setCacheHitRate(cacheName: string, hitRate: number): void {
    this.cacheHitRateGauge.labels({ cache: cacheName }).set(hitRate);
  }

  public setActiveConnections(count: number): void {
    this.resourceMonitor.setActiveConnections(count);
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const resources = this.resourceMonitor.getCurrentMetrics();

    const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
    const p50 = this.calculatePercentile(sortedTimes, 50);
    const p95 = this.calculatePercentile(sortedTimes, 95);
    const p99 = this.calculatePercentile(sortedTimes, 99);
    const max = sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;

    const now = Date.now();
    const timeDiff = (now - this.lastUpdateTime) / 1000;
    const rps = timeDiff > 0 ? this.requestCount / timeDiff : 0;
    const eps = timeDiff > 0 ? this.errorCount / timeDiff : 0;
    const avgResponseTime =
      sortedTimes.length > 0
        ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
        : 0;

    return {
      throughput: {
        requestsPerSecond: rps,
        errorsPerSecond: eps,
        averageResponseTime: avgResponseTime,
      },
      latency: {
        p50,
        p95,
        p99,
        max: max || 0,
      },
      errors: {
        rate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
        types: { ...this.errorCounts },
      },
      resources,
    };
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  public async getMetrics(): Promise<string> {
    return await this.resourceMonitor.getMetrics();
  }

  public clearMetrics(): void {
    this.resourceMonitor.clearMetrics();
    this.requestTimes = [];
    this.errorCounts = {};
    this.requestCount = 0;
    this.errorCount = 0;
  }
}
