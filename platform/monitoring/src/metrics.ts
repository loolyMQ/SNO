import { PrometheusMetrics } from './prometheus';

export class MetricsCollector {
  private metrics: PrometheusMetrics;

  constructor() {
    this.metrics = PrometheusMetrics.getInstance();
  }

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.metrics.recordHttpRequest(method, route, statusCode, duration);
  }

  public updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.metrics.setMemoryUsage('rss', memUsage.rss);
    this.metrics.setMemoryUsage('heapTotal', memUsage.heapTotal);
    this.metrics.setMemoryUsage('heapUsed', memUsage.heapUsed);
    this.metrics.setMemoryUsage('external', memUsage.external);
  }

  public setActiveConnections(count: number): void {
    this.metrics.setActiveConnections(count);
  }

  public async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}

export const createMetricsCollector = (): MetricsCollector => {
  return new MetricsCollector();
};
