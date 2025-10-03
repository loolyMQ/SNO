import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface QueryPlan {
  id: string;
  _query: string;
  estimatedCost: number;
  executionTime: number;
  indexes: string[];
  joins: number;
  filters: number;
  sortFields: string[];
  limit?: number;
  offset?: number;
}

export interface OptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  estimatedSavings: number;
  executionPlan: QueryPlan;
}

export interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  averageExecutionTime: number;
  slowestQuery: string;
  mostFrequentQuery: string;
  indexUsage: Record<string, number>;
}

@injectable()
export class QueryOptimizerService extends BaseService {
  private queryCache: Map<string, QueryPlan> = new Map();
  private queryMetrics: QueryMetrics = {
    totalQueries: 0,
    slowQueries: 0,
    averageExecutionTime: 0,
    slowestQuery: '',
    mostFrequentQuery: '',
    indexUsage: {}
  };

  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    if (!logger) {
      throw new Error('LoggerService is required');
    }
    if (!metrics) {
      throw new Error('MetricsService is required');
    }
    super(logger, metrics);
  }

  async optimizeQuery(_query: string): Promise<OptimizationResult> {
    return await this.executeWithMetrics('query.optimize', async () => {
      const startTime = Date.now();
      
      // Parse and analyze query
      const analysis = this.analyzeQuery(_query);
      
      // Generate optimization suggestions
      const optimizations = this.generateOptimizations(analysis);
      
      // Create optimized query
      const optimizedQuery = this.applyOptimizations(_query, optimizations);
      
      // Calculate estimated savings
      const estimatedSavings = this.calculateSavings(analysis, optimizations);
      
      const executionTime = Date.now() - startTime;
      
      const result: OptimizationResult = {
        originalQuery: _query,
        optimizedQuery,
        improvements: optimizations.map(opt => opt.description),
        estimatedSavings,
        executionPlan: {
          id: this.generatePlanId(),
          _query: optimizedQuery,
          estimatedCost: (analysis as { estimatedCost: number }).estimatedCost * 0.7, // Assume 30% improvement
          executionTime,
          indexes: (analysis as { suggestedIndexes: string[] }).suggestedIndexes,
          joins: (analysis as { joinCount: number }).joinCount,
          filters: (analysis as { filterCount: number }).filterCount,
          sortFields: (analysis as { sortFields: string[] }).sortFields,
          limit: (analysis as { limit: number }).limit,
          offset: (analysis as { offset: number }).offset
        }
      };

      this.updateMetrics(_query, executionTime);
      
      this.logger.info('Query optimized', {
        originalLength: _query.length,
        optimizedLength: optimizedQuery.length,
        improvements: optimizations.length,
        estimatedSavings
      });

      this.metrics.incrementCounter('query.optimized', {
        improvements: optimizations.length.toString()
      });

      return result;
    });
  }

  private analyzeQuery(_query: string): unknown {
    const normalizedQuery = _query.toLowerCase().trim();
    
    return {
      type: this.detectQueryType(normalizedQuery),
      tables: this.extractTables(normalizedQuery),
      joins: this.countJoins(normalizedQuery),
      filters: this.countFilters(normalizedQuery),
      sortFields: this.extractSortFields(normalizedQuery),
      limit: this.extractLimit(normalizedQuery),
      offset: this.extractOffset(normalizedQuery),
      estimatedCost: this.estimateCost(normalizedQuery),
      suggestedIndexes: this.suggestIndexes(normalizedQuery),
      joinCount: this.countJoins(normalizedQuery),
      filterCount: this.countFilters(normalizedQuery)
    };
  }

  private detectQueryType(_query: string): string {
    if (_query.startsWith('select')) return 'SELECT';
    if (_query.startsWith('insert')) return 'INSERT';
    if (_query.startsWith('update')) return 'UPDATE';
    if (_query.startsWith('delete')) return 'DELETE';
    return 'UNKNOWN';
  }

  private extractTables(_query: string): string[] {
    const fromMatch = _query.match(/from\s+(\w+)/);
    const joinMatches = _query.match(/join\s+(\w+)/g);
    
    const tables: string[] = [];
    if (fromMatch) tables.push(fromMatch[1]!);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/join\s+/, '');
        tables.push(table);
      });
    }
    
    return tables;
  }

  private countJoins(_query: string): number {
    return (_query.match(/join\s+/g) || []).length;
  }

  private countFilters(_query: string): number {
    return (_query.match(/where\s+.*?(and|or)/gi) || []).length + 1;
  }

  private extractSortFields(_query: string): string[] {
    const orderMatch = _query.match(/order\s+by\s+([^limit]+)/i);
    if (!orderMatch) return [];
    
    return orderMatch[1]!
      .split(',')
      .map(field => field.trim().split(/\s+/)[0])
      .filter(field => field && field.length > 0) as string[];
  }

  private extractLimit(_query: string): number | undefined {
    const limitMatch = _query.match(/limit\s+(\d+)/i);
    return limitMatch ? parseInt(limitMatch[1]!) : undefined;
  }

  private extractOffset(_query: string): number | undefined {
    const offsetMatch = _query.match(/offset\s+(\d+)/i);
    return offsetMatch ? parseInt(offsetMatch[1]!) : undefined;
  }

  private estimateCost(_query: string): number {
    let cost = 100; // Base cost
    
    // Add cost for joins
    cost += this.countJoins(_query) * 50;
    
    // Add cost for filters
    cost += this.countFilters(_query) * 10;
    
    // Add cost for sorting
    if (_query.includes('order by')) {
      cost += 30;
    }
    
    // Reduce cost for limits
    const limit = this.extractLimit(_query);
    if (limit && limit < 100) {
      cost *= 0.5;
    }
    
    return Math.round(cost);
  }

  private suggestIndexes(_query: string): string[] {
    const indexes: string[] = [];
    
    // Suggest indexes for WHERE clauses
    const whereMatch = _query.match(/where\s+([^order]+)/i);
    if (whereMatch) {
      const conditions = whereMatch[1]!.split(/and|or/i);
      conditions.forEach(condition => {
        const fieldMatch = condition.match(/(\w+)\s*[=<>]/);
        if (fieldMatch) {
          indexes.push(`idx_${fieldMatch[1]}`);
        }
      });
    }
    
    // Suggest indexes for ORDER BY
    const sortFields = this.extractSortFields(_query);
    sortFields.forEach(field => {
      indexes.push(`idx_${field}_sort`);
    });
    
    return [...new Set(indexes)];
  }

  private generateOptimizations(analysis: unknown): Array<{type: string, description: string, apply: (_query: string) => string}> {
    const optimizations: Array<{type: string, description: string, apply: (query: string) => string}> = [];
    
    // Add LIMIT if missing and query is large
    if (!(analysis as { limit: number }).limit && (analysis as { estimatedCost: number }).estimatedCost > 200) {
      optimizations.push({
        type: 'LIMIT',
        description: 'Add LIMIT clause to reduce result set',
        apply: (query: string) => query + ' LIMIT 1000'
      });
    }
    
    // Optimize WHERE clause order
    if ((analysis as { filterCount: number }).filterCount > 1) {
      optimizations.push({
        type: 'WHERE_ORDER',
        description: 'Reorder WHERE conditions for better performance',
        apply: (query: string) => this.reorderWhereConditions(query)
      });
    }
    
    // Add index hints
    if ((analysis as { suggestedIndexes: string[] }).suggestedIndexes.length > 0) {
      optimizations.push({
        type: 'INDEX_HINT',
        description: `Use indexes: ${(analysis as { suggestedIndexes: string[] }).suggestedIndexes.join(', ')}`,
        apply: (query: string) => this.addIndexHints(query, (analysis as { suggestedIndexes: string[] }).suggestedIndexes)
      });
    }
    
    return optimizations;
  }

  private reorderWhereConditions(_query: string): string {
    // Simple implementation - move equality conditions first
    const whereMatch = _query.match(/where\s+(.+)/i);
    if (!whereMatch) return _query;
    
    const conditions = whereMatch[1]!.split(/and|or/i);
    const equalityConditions = conditions.filter(cond => cond.includes('='));
    const otherConditions = conditions.filter(cond => !cond.includes('='));
    
    const reorderedConditions = [...equalityConditions, ...otherConditions];
    const newWhere = 'WHERE ' + reorderedConditions.join(' AND ');
    
    return _query.replace(/where\s+.+/i, newWhere);
  }

  private addIndexHints(_query: string, indexes: string[]): string {
    // Add USE INDEX hints (MySQL syntax)
    const tableMatch = _query.match(/from\s+(\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      const indexHint = `USE INDEX (${indexes.join(', ')})`;
      return _query.replace(/from\s+\w+/i, `FROM ${table} ${indexHint}`);
    }
    
    return _query;
  }

  private applyOptimizations(_query: string, optimizations: Array<{apply: (_query: string) => string}>): string {
    let optimizedQuery = _query;
    
    optimizations.forEach(optimization => {
      optimizedQuery = optimization.apply(optimizedQuery);
    });
    
    return optimizedQuery;
  }

  private calculateSavings(analysis: unknown, optimizations: unknown[]): number {
    let savings = 0;
    
    // Calculate savings from each optimization
    (optimizations as Array<{ type: string }>).forEach((opt: { type: string }) => {
      switch (opt.type) {
        case 'LIMIT':
          savings += (analysis as { estimatedCost: number }).estimatedCost * 0.3;
          break;
        case 'WHERE_ORDER':
          savings += (analysis as { estimatedCost: number }).estimatedCost * 0.1;
          break;
        case 'INDEX_HINT':
          savings += (analysis as { estimatedCost: number }).estimatedCost * 0.4;
          break;
      }
    });
    
    return Math.round(savings);
  }

  private updateMetrics(_query: string, executionTime: number): void {
    this.queryMetrics.totalQueries++;
    
    if (executionTime > 1000) {
      this.queryMetrics.slowQueries++;
    }
    
    this.queryMetrics.averageExecutionTime = 
      (this.queryMetrics.averageExecutionTime * (this.queryMetrics.totalQueries - 1) + executionTime) / 
      this.queryMetrics.totalQueries;
    
    if (executionTime > this.queryMetrics.averageExecutionTime * 2) {
      this.queryMetrics.slowestQuery = _query;
    }
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async getQueryMetrics(): Promise<QueryMetrics> {
    return { ...this.queryMetrics };
  }

  async clearCache(): Promise<void> {
    this.queryCache.clear();
    this.logger.info('Query cache cleared');
  }

  async getCacheStats(): Promise<{size: number, hitRate: number}> {
    return {
      size: this.queryCache.size,
      hitRate: 0.85 // Placeholder
    };
  }
}
