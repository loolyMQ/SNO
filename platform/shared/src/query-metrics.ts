import { Counter, Histogram, Gauge } from 'prom-client';
import { IQueryAnalysis } from './query-analyzer';

const queryExecutionTime = new Histogram({
  name: 'db_query_execution_time_seconds',
  help: 'Database query execution time',
  labelNames: ['query_type', 'table', 'optimization_level'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});

const queryCount = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['query_type', 'table', 'status'],
});

const slowQueriesCount = new Counter({
  name: 'db_slow_queries_total',
  help: 'Total number of slow queries',
  labelNames: ['query_type', 'table', 'threshold'],
});

const queryPlanCost = new Histogram({
  name: 'db_query_plan_cost',
  help: 'Database query plan cost estimation',
  labelNames: ['query_type', 'table'],
  buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000],
});

const cacheHitRatio = new Gauge({
  name: 'db_cache_hit_ratio',
  help: 'Database cache hit ratio',
  labelNames: ['cache_type'],
});

const indexUsageStats = new Counter({
  name: 'db_index_usage_total',
  help: 'Database index usage statistics',
  labelNames: ['table', 'index_name', 'usage_type'],
});

export interface IQueryMetricsConfig {
  slowQueryThreshold: number;
  verySlowQueryThreshold: number;
  enableMetrics: boolean;
}

export class QueryMetrics {
  private config: IQueryMetricsConfig;
  private slowQueries: Array<{ query: string; time: number; timestamp: number }> = [];

  constructor(config: IQueryMetricsConfig) {
    this.config = config;
  }

  recordQuery(
    queryType: string,
    table: string,
    executionTime: number,
    analysis: IQueryAnalysis
  ): void {
    if (!this.config.enableMetrics) return;

    queryExecutionTime
      .labels(queryType, table, analysis.optimizationLevel)
      .observe(executionTime / 1000);

    queryCount.labels(queryType, table, 'success').inc();

    queryPlanCost.labels(queryType, table).observe(analysis.planCost);

    analysis.indexesUsed.forEach(indexName => {
      indexUsageStats.labels(table, indexName, 'used').inc();
    });

    if (executionTime > this.config.slowQueryThreshold) {
      this.handleSlowQuery(queryType, table, executionTime, analysis);
    }
  }

  recordError(queryType: string, table: string, _error: Error): void {
    if (!this.config.enableMetrics) return;

    queryCount.labels(queryType, table, 'error').inc();
  }

  updateCacheHitRatio(hitRatio: number): void {
    if (!this.config.enableMetrics) return;

    cacheHitRatio.labels('query_cache').set(hitRatio);
  }

  getSlowQueries(): Array<{ query: string; time: number; timestamp: number }> {
    return [...this.slowQueries];
  }

  getMetrics(): {
    totalQueries: number;
    slowQueries: number;
    averageExecutionTime: number;
    cacheHitRatio: number;
  } {
    const totalQueries = this.slowQueries.length;
    const slowQueries = this.slowQueries.filter(
      q => q.time > this.config.slowQueryThreshold
    ).length;
    const averageExecutionTime =
      totalQueries > 0 ? this.slowQueries.reduce((sum, q) => sum + q.time, 0) / totalQueries : 0;

    return {
      totalQueries,
      slowQueries,
      averageExecutionTime,
      cacheHitRatio: 0,
    };
  }

  private handleSlowQuery(
    queryType: string,
    table: string,
    executionTime: number,
    analysis: IQueryAnalysis
  ): void {
    this.slowQueries.push({
      query: analysis.query.substring(0, 500),
      time: executionTime,
      timestamp: Date.now(),
    });

    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    const threshold = executionTime > this.config.verySlowQueryThreshold ? 'very_slow' : 'slow';
    slowQueriesCount.inc({ query_type: queryType, table, threshold });
  }

  extractQueryType(query: string): string {
    const upperQuery = query.trim().toUpperCase();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    if (upperQuery.startsWith('CREATE')) return 'CREATE';
    if (upperQuery.startsWith('DROP')) return 'DROP';
    if (upperQuery.startsWith('ALTER')) return 'ALTER';
    return 'OTHER';
  }

  extractTableName(query: string): string {
    const upperQuery = query.toUpperCase();
    const fromMatch = upperQuery.match(/FROM\s+(\w+)/);
    if (fromMatch) return fromMatch[1]!;

    const insertMatch = upperQuery.match(/INSERT\s+INTO\s+(\w+)/);
    if (insertMatch) return insertMatch[1]!;

    const updateMatch = upperQuery.match(/UPDATE\s+(\w+)/);
    if (updateMatch) return updateMatch[1]!;

    const deleteMatch = upperQuery.match(/DELETE\s+FROM\s+(\w+)/);
    if (deleteMatch) return deleteMatch[1]!;

    return 'unknown';
  }
}
