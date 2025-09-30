import { Pool } from 'pg';
import pino from 'pino';
import { IQueryAnalysis } from './query-analyzer';
import { QueryCache } from './query-cache';
import { QueryMetrics } from './query-metrics';

export interface IQueryExecutorConfig {
  enableOptimization: boolean;
  enableCaching: boolean;
  enableMetrics: boolean;
  slowQueryThreshold: number;
  verySlowQueryThreshold: number;
}

export interface IQueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  improvementFactor: number;
  optimizations: string[];
}

export class QueryExecutor {
  private cache: QueryCache;
  private metrics: QueryMetrics;

  constructor(
    private pool: Pool,
    private config: IQueryExecutorConfig,
    private logger: pino.Logger
  ) {
    this.cache = new QueryCache({
      maxSize: 1000,
      ttl: 300000,
      enableCompression: false,
    });

    this.metrics = new QueryMetrics({
      slowQueryThreshold: config.slowQueryThreshold,
      verySlowQueryThreshold: config.verySlowQueryThreshold,
      enableMetrics: config.enableMetrics,
    });
  }

  async executeOptimized<T>(
    query: string,
    params: unknown[] = [],
    options: {
      enableOptimization?: boolean;
      forceAnalyze?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<{ result: T; analysis: IQueryAnalysis }> {
    const startTime = Date.now();
    const queryType = this.metrics.extractQueryType(query);
    const table = this.metrics.extractTableName(query);

    try {
      const cacheKey = this.cache.generateKey(query, params);
      let analysis: IQueryAnalysis;

      if (this.config.enableCaching && !options.forceAnalyze) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.logger.debug('Query cache hit', { query: query.substring(0, 100) });
          return { result: await this.executeQuery<T>(query, params), analysis: cached };
        }
      }

      analysis = await this.analyzeQuery(query, params);

      if (this.config.enableCaching && options.cacheResults !== false) {
        this.cache.set(cacheKey, analysis);
      }

      let finalQuery = query;
      if (options.enableOptimization && analysis.optimizationLevel === 'poor') {
        const optimization = await this.optimizeQuery(query);
        if (optimization.improvementFactor > 1.2) {
          finalQuery = optimization.optimizedQuery;
          this.logger.info(`Query optimized with ${optimization.improvementFactor}x improvement`);
        }
      }

      const result = await this.executeQuery<T>(finalQuery, params);
      const executionTime = Date.now() - startTime;

      this.metrics.recordQuery(queryType, table, executionTime, analysis);

      if (executionTime > this.config.slowQueryThreshold) {
        this.logger.warn('Slow query detected', {
          query: query.substring(0, 200),
          executionTime,
          optimizationLevel: analysis.optimizationLevel,
          recommendations: analysis.recommendations,
        });
      }

      return { result, analysis };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.metrics.recordError(queryType, table, error as Error);

      this.logger.error('Query execution failed', {
        query: query.substring(0, 200),
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  private async executeQuery<T>(query: string, params: unknown[] = []): Promise<T> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(query, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  }

  private async analyzeQuery(query: string, params: unknown[] = []): Promise<IQueryAnalysis> {
    const startTime = Date.now();

    try {
      const client = await this.pool.connect();
      let plan: Record<string, unknown>;
      let rowsReturned = 0;

      try {
        if (this.shouldUseExplainAnalyze(query)) {
          const explainResult = await client.query(
            `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
            params
          );
          const planData = (explainResult.rows[0] as any)['QUERY PLAN'][0];

          plan = {
            planRows: (planData['Plan'] as any)['Plan Rows'] || 0,
            planCost: (planData['Plan'] as any)['Total Cost'] || 0,
            actualRows: (planData['Plan'] as any)['Actual Rows'] || 0,
            actualTime: (planData['Plan'] as any)['Actual Total Time'] || 0,
            indexScans: this.extractIndexScans(planData as any),
            seqScans: this.extractSeqScans(planData as any),
            joins: this.extractJoins(planData as any),
            sorts: this.extractSorts(planData as any),
          } as any;

          rowsReturned = (plan as any).actualRows || 0;
        } else {
          const result = await client.query(query, params);
          rowsReturned = result.rows.length;

          plan = {
            planRows: rowsReturned,
            planCost: 0,
            actualRows: rowsReturned,
            actualTime: Date.now() - startTime,
          };
        }
      } finally {
        client.release();
      }

      const executionTime = Date.now() - startTime;
      const indexesUsed = (plan as any).indexScans || [];
      const recommendations = this.generateRecommendations(plan, executionTime);
      const optimizationLevel = this.calculateOptimizationLevel(plan as any, executionTime);

      return {
        query,
        executionTime,
        planCost: (plan as any).planCost,
        rowsReturned,
        indexesUsed,
        recommendations,
        optimizationLevel,
      };
    } catch (error) {
      this.logger.error('Query analysis failed:', { query, error });
      throw error;
    }
  }

  private async optimizeQuery(query: string): Promise<IQueryOptimization> {
    const optimizations: string[] = [];
    let optimizedQuery = query;
    let improvementFactor = 1.0;

    if (query.toUpperCase().includes('SELECT *')) {
      optimizedQuery = query.replace(/SELECT \*/gi, 'SELECT specific_columns');
      optimizations.push('Replaced SELECT * with specific columns');
      improvementFactor *= 1.2;
    }

    if (query.toUpperCase().includes('ORDER BY') && !query.toUpperCase().includes('LIMIT')) {
      optimizations.push('Consider adding LIMIT clause to ORDER BY queries');
    }

    if (query.toUpperCase().includes('WHERE') && query.toUpperCase().includes('LIKE')) {
      optimizations.push('Consider using full-text search instead of LIKE for better performance');
    }

    return {
      originalQuery: query,
      optimizedQuery,
      improvementFactor,
      optimizations,
    };
  }

  private shouldUseExplainAnalyze(query: string): boolean {
    const upperQuery = query.toUpperCase().trim();
    return upperQuery.startsWith('SELECT') && !upperQuery.includes('LIMIT 0');
  }

  private extractIndexScans(planData: Record<string, unknown>): string[] {
    const indexScans: string[] = [];
    this.traversePlan(
      planData['Plan'] as Record<string, unknown>,
      (node: Record<string, unknown>) => {
        if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Index Only Scan') {
          const indexName = node['Index Name'];
          if (indexName) {
            indexScans.push(indexName as string);
          }
        }
      }
    );
    return indexScans;
  }

  private extractSeqScans(planData: Record<string, unknown>): string[] {
    const seqScans: string[] = [];
    this.traversePlan(
      planData['Plan'] as Record<string, unknown>,
      (node: Record<string, unknown>) => {
        if (node['Node Type'] === 'Seq Scan') {
          const relationName = node['Relation Name'];
          if (relationName) {
            seqScans.push(relationName as string);
          }
        }
      }
    );
    return seqScans;
  }

  private extractJoins(planData: Record<string, unknown>): string[] {
    const joins: string[] = [];
    this.traversePlan(
      planData['Plan'] as Record<string, unknown>,
      (node: Record<string, unknown>) => {
        if (node['Node Type'] && (node['Node Type'] as string).includes('Join')) {
          joins.push(node['Node Type'] as string);
        }
      }
    );
    return joins;
  }

  private extractSorts(planData: Record<string, unknown>): string[] {
    const sorts: string[] = [];
    this.traversePlan(
      planData['Plan'] as Record<string, unknown>,
      (node: Record<string, unknown>) => {
        if (node['Node Type'] === 'Sort') {
          sorts.push('Sort');
        }
      }
    );
    return sorts;
  }

  private traversePlan(
    plan: Record<string, unknown>,
    callback: (node: Record<string, unknown>) => void
  ): void {
    if (!plan) return;

    callback(plan);

    if (plan['Plans'] && Array.isArray(plan['Plans'])) {
      plan['Plans'].forEach((subPlan: unknown) =>
        this.traversePlan(subPlan as Record<string, unknown>, callback)
      );
    }
  }

  private generateRecommendations(plan: any, executionTime: number): string[] {
    const recommendations: string[] = [];

    if (plan.seqScans && plan.seqScans.length > 0) {
      recommendations.push(`Consider adding indexes for tables: ${plan.seqScans.join(', ')}`);
    }

    if (plan.planCost > 1000) {
      recommendations.push('Query has high cost - consider optimization');
    }

    if (executionTime > 1000) {
      recommendations.push('Query execution time is high - consider adding indexes or rewriting');
    }

    if (plan.sorts && plan.sorts.length > 0) {
      recommendations.push('Query uses sorting - consider adding indexes for ORDER BY columns');
    }

    if (plan.joins && plan.joins.length > 0) {
      recommendations.push('Query uses joins - ensure proper indexes on join columns');
    }

    return recommendations;
  }

  private calculateOptimizationLevel(
    plan: any,
    executionTime: number
  ): 'excellent' | 'good' | 'poor' | 'critical' {
    if (executionTime < 100 && plan.planCost < 100) return 'excellent';
    if (executionTime < 500 && plan.planCost < 500) return 'good';
    if (executionTime < 2000 && plan.planCost < 2000) return 'poor';
    return 'critical';
  }

  getCacheStats(): Record<string, unknown> {
    return this.cache.getStats();
  }

  getMetrics(): Record<string, unknown> {
    return this.metrics.getMetrics();
  }

  clearCache(): void {
    this.cache.clear();
  }
}
