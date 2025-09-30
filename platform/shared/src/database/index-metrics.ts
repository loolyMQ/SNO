import { register, Counter, Histogram, Gauge } from 'prom-client';
import pino from 'pino';

export class IndexMetrics {
  private indexUsageCounter: Counter<string>;
  private indexHitRateGauge: Gauge<string>;
  private indexExecutionTimeHistogram: Histogram<string>;
  private indexSizeGauge: Gauge<string>;
  private slowQueryCounter: Counter<string>;
  private logger: pino.Logger;
  private indexUsageName: string;
  private indexHitRateName: string;
  private indexExecTimeName: string;
  private indexSizeName: string;
  private slowQueryName: string;

  constructor(serviceName: string, logger: pino.Logger) {
    this.logger = logger;
    this.indexUsageName = `${serviceName}_index_usage_total`;
    this.indexHitRateName = `${serviceName}_index_hit_rate`;
    this.indexExecTimeName = `${serviceName}_index_execution_time_seconds`;
    this.indexSizeName = `${serviceName}_index_size`;
    this.slowQueryName = `${serviceName}_slow_queries_total`;

    this.indexUsageCounter = new Counter({
      name: this.indexUsageName,
      help: 'Total number of index usages',
      labelNames: ['index_name', 'operation', 'status'],
    });

    this.indexHitRateGauge = new Gauge({
      name: this.indexHitRateName,
      help: 'Index hit rate percentage',
      labelNames: ['index_name'],
    });

    this.indexExecutionTimeHistogram = new Histogram({
      name: this.indexExecTimeName,
      help: 'Index execution time in seconds',
      labelNames: ['index_name', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.indexSizeGauge = new Gauge({
      name: this.indexSizeName,
      help: 'Number of documents in index',
      labelNames: ['index_name'],
    });

    this.slowQueryCounter = new Counter({
      name: this.slowQueryName,
      help: 'Total number of slow queries',
      labelNames: ['index_name', 'threshold'],
    });

    register.registerMetric(this.indexUsageCounter);
    register.registerMetric(this.indexHitRateGauge);
    register.registerMetric(this.indexExecutionTimeHistogram);
    register.registerMetric(this.indexSizeGauge);
    register.registerMetric(this.slowQueryCounter);
  }

  recordIndexUsage(indexName: string, operation: string, status: 'success' | 'error'): void {
    this.indexUsageCounter.inc({ index_name: indexName, operation, status });
  }

  recordIndexExecutionTime(indexName: string, operation: string, executionTimeMs: number): void {
    this.indexExecutionTimeHistogram.labels(indexName, operation).observe(executionTimeMs / 1000);
  }

  recordIndexHitRate(indexName: string, hitRate: number): void {
    this.indexHitRateGauge.labels(indexName).set(hitrateSafe(hitRate));
  }

  recordIndexSize(indexName: string, size: number): void {
    this.indexSizeGauge.labels(indexName).set(size);
  }

  recordSlowQuery(indexName: string, threshold: string): void {
    this.slowQueryCounter.inc({ index_name: indexName, threshold });
  }

  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  async getIndexUsageStats(): Promise<{
    totalUsages: number;
    successRate: number;
    averageExecutionTime: number;
    slowQueries: number;
  }> {
    const metrics = await register.getMetricsAsJSON();

    let totalUsages = 0;
    let successUsages = 0;
    let totalExecutionTime = 0;
    let executionCount = 0;
    let slowQueries = 0;

    for (const metric of metrics) {
      if (metric.name === this.indexUsageName) {
        totalUsages += metric.values.reduce(
          (sum: number, val: any) => sum + (val.value as number),
          0
        );
        successUsages += metric.values
          .filter((val: any) => val.labels.status === 'success')
          .reduce((sum: number, val: any) => sum + (val.value as number), 0);
      }

      if (metric.name === this.indexExecTimeName) {
        for (const value of metric.values as any[]) {
          const v = value.value as number;
          const c = (value.count as number) || 0;
          totalExecutionTime += v * c;
          executionCount += c;
        }
      }

      if (metric.name === this.slowQueryName) {
        slowQueries += metric.values.reduce(
          (sum: number, val: any) => sum + (val.value as number),
          0
        );
      }
    }

    return {
      totalUsages,
      successRate: totalUsages > 0 ? (successUsages / totalUsages) * 100 : 0,
      averageExecutionTime: executionCount > 0 ? totalExecutionTime / executionCount : 0,
      slowQueries,
    };
  }

  async getIndexPerformanceReport(): Promise<string> {
    const stats = await this.getIndexUsageStats();
    const metrics = await register.getMetricsAsJSON();

    let report = '# Index Performance Metrics\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Overall Statistics\n\n';
    report += `- Total Index Usages: ${stats.totalUsages}\n`;
    report += `- Success Rate: ${stats.successRate.toFixed(2)}%\n`;
    report += `- Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms\n`;
    report += `- Slow Queries: ${stats.slowQueries}\n\n`;

    report += '## Index Details\n\n';

    const indexMetrics = metrics.filter(
      (m: any) =>
        m.name.includes('index') &&
        (m.name.includes('usage') || m.name.includes('hit_rate') || m.name.includes('size'))
    );

    const indexNames = new Set<string>();
    for (const metric of indexMetrics as any[]) {
      for (const value of metric.values as any[]) {
        if (value.labels.index_name) {
          indexNames.add(value.labels.index_name as string);
        }
      }
    }

    for (const indexName of indexNames) {
      report += `### ${indexName}\n`;

      const usageMetric = (indexMetrics as any[]).find(m => m.name === this.indexUsageName);
      if (usageMetric) {
        const usage = (usageMetric.values as any[])
          .filter(v => v.labels.index_name === indexName)
          .reduce((sum: number, v: any) => sum + (v.value as number), 0);
        report += `- Total Usages: ${usage}\n`;
      }

      const hitRateMetric = (indexMetrics as any[]).find(m => m.name === this.indexHitRateName);
      if (hitRateMetric) {
        const hitRate = (hitRateMetric.values as any[]).find(
          v => v.labels.index_name === indexName
        );
        if (hitRate) {
          report += `- Hit Rate: ${hitRate.value.toFixed(2)}%\n`;
        }
      }

      const sizeMetric = (indexMetrics as any[]).find(m => m.name === this.indexSizeName);
      if (sizeMetric) {
        const size = (sizeMetric.values as any[]).find(v => v.labels.index_name === indexName);
        if (size) {
          report += `- Size: ${size.value} documents\n`;
        }
      }

      report += '\n';
    }

    return report;
  }

  resetMetrics(): void {
    register.clear();
    this.logger.info('Index metrics reset');
  }

  async getPrometheusMetrics(): Promise<string> {
    return await register.metrics();
  }
}

function hitrateSafe(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return value;
}
