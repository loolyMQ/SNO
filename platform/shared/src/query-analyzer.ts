import { Pool } from 'pg';
import pino from 'pino';

export interface IQueryPlan {
  planRows: number;
  planCost: number;
  actualRows?: number;
  actualTime?: number;
  indexScans?: string[];
  seqScans?: string[];
  joins?: string[];
  sorts?: string[];
}

export interface IQueryAnalysis {
  query: string;
  executionTime: number;
  planCost: number;
  rowsReturned: number;
  indexesUsed: string[];
  recommendations: string[];
  optimizationLevel: 'excellent' | 'good' | 'poor' | 'critical';
}

export class QueryAnalyzer {
  constructor(
    private pool: Pool,
    private logger: pino.Logger
  ) {}

  async analyzeQuery(query: string, params: unknown[] = []): Promise<IQueryAnalysis> {
    const startTime = Date.now();

    try {
      const client = await this.pool.connect();
      let plan: IQueryPlan;
      let rowsReturned = 0;

      try {
        if (this.shouldUseExplainAnalyze(query)) {
          const explainResult = await client.query(
            `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
            params
          );
          const planData = explainResult.rows[0]['QUERY PLAN'][0];

          plan = {
            planRows: planData['Plan']['Plan Rows'] || 0,
            planCost: planData['Plan']['Total Cost'] || 0,
            actualRows: planData['Plan']['Actual Rows'] || 0,
            actualTime: planData['Plan']['Actual Total Time'] || 0,
            indexScans: this.extractIndexScans(planData),
            seqScans: this.extractSeqScans(planData),
            joins: this.extractJoins(planData),
            sorts: this.extractSorts(planData),
          };

          rowsReturned = plan.actualRows || 0;
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
      const indexesUsed = plan.indexScans || [];
      const recommendations = this.generateRecommendations(plan, executionTime);
      const optimizationLevel = this.calculateOptimizationLevel(plan, executionTime);

      return {
        query,
        executionTime,
        planCost: plan.planCost,
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

  private generateRecommendations(plan: IQueryPlan, executionTime: number): string[] {
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
    plan: IQueryPlan,
    executionTime: number
  ): 'excellent' | 'good' | 'poor' | 'critical' {
    if (executionTime < 100 && plan.planCost < 100) return 'excellent';
    if (executionTime < 500 && plan.planCost < 500) return 'good';
    if (executionTime < 2000 && plan.planCost < 2000) return 'poor';
    return 'critical';
  }
}
