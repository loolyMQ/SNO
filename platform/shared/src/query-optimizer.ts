import { Pool } from 'pg';
import pino from 'pino';
import { QueryExecutor, IQueryExecutorConfig } from './query-executor';

export interface ISlowQueryConfig {
  slowQueryThreshold: number;
  verySlowQueryThreshold: number;
  enableExplainAnalyze: boolean;
  enableQueryRewriting: boolean;
  enableIndexSuggestions: boolean;
  logSlowQueries: boolean;
}

export class QueryOptimizer {
  private executor: QueryExecutor;

  constructor(
    private _pool: Pool,
    private _config: ISlowQueryConfig,
    private _logger: pino.Logger
  ) {
    // Constructor parameters are stored for potential future use
    // Parameters are intentionally unused but stored for future use
    void this._pool;
    void this._config;
    void this._logger;
    const executorConfig: IQueryExecutorConfig = {
      enableOptimization: _config.enableQueryRewriting,
      enableCaching: true,
      enableMetrics: true,
      slowQueryThreshold: _config.slowQueryThreshold,
      verySlowQueryThreshold: _config.verySlowQueryThreshold,
    };

    this.executor = new QueryExecutor(_pool, executorConfig, _logger);
  }

  async executeOptimized<T>(
    query: string,
    params: unknown[] = [],
    options: {
      enableOptimization?: boolean;
      forceAnalyze?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<{ result: T; analysis: any }> {
    return this.executor.executeOptimized<T>(query, params, options);
  }

  getCacheStats(): Record<string, unknown> {
    return this.executor.getCacheStats();
  }

  getMetrics(): Record<string, unknown> {
    return this.executor.getMetrics();
  }

  clearCache(): void {
    this.executor.clearCache();
  }
}

export const createQueryOptimizer = (
  pool: Pool,
  config: ISlowQueryConfig,
  logger: pino.Logger
): QueryOptimizer => {
  return new QueryOptimizer(pool, config, logger);
};
