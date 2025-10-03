import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { ConnectionPoolService } from '../pools/connection-pool.service';

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  unique: boolean;
  partial?: string;
  include?: string[];
  concurrent: boolean;
  fillfactor?: number;
  tablespace?: string;
}

export interface IndexMetrics {
  name: string;
  table: string;
  size: number;
  usage: {
    scans: number;
    tuplesRead: number;
    tuplesFetched: number;
  };
  efficiency: {
    hitRate: number;
    avgScanTime: number;
  };
  maintenance: {
    lastAnalyzed: Date;
    lastVacuumed: Date;
    bloatRatio: number;
  };
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedBenefit: number;
}

@injectable()
export class IndexManagerService extends BaseService {
  private readonly poolService: ConnectionPoolService;
  private readonly indexDefinitions: Map<string, IndexDefinition> = new Map();
  private readonly indexMetrics: Map<string, IndexMetrics> = new Map();

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    poolService: ConnectionPoolService
  ) {
    super(logger, metrics);
    this.poolService = poolService;
  }

  async createIndex(definition: IndexDefinition): Promise<boolean> {
    return await this.executeWithMetrics('index.create', async () => {
      try {
        const sql = this.buildCreateIndexSQL(definition);
        
        await this.poolService.executeQuery('main', sql);
        
        this.indexDefinitions.set(definition.name, definition);
        
        this.logger.info('Index created successfully', {
          name: definition.name,
          table: definition.table,
          columns: definition.columns,
          type: definition.type
        });

        this.metrics.incrementCounter('index.created', {
          name: definition.name,
          table: definition.table,
          type: definition.type
        });

        return true;

      } catch (error) {
        this.logger.error('Failed to create index', {
          name: definition.name,
          table: definition.table,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('index.create_failed', {
          name: definition.name,
          table: definition.table,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async dropIndex(name: string, concurrent: boolean = false): Promise<boolean> {
    return await this.executeWithMetrics('index.drop', async () => {
      try {
        const concurrentClause = concurrent ? 'CONCURRENTLY' : '';
        const sql = `DROP INDEX ${concurrentClause} IF EXISTS ${name}`;
        
        await this.poolService.executeQuery('main', sql);
        
        this.indexDefinitions.delete(name);
        this.indexMetrics.delete(name);
        
        this.logger.info('Index dropped successfully', {
          name,
          concurrent
        });

        this.metrics.incrementCounter('index.dropped', {
          name,
          concurrent: concurrent.toString()
        });

        return true;

      } catch (error) {
        this.logger.error('Failed to drop index', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('index.drop_failed', {
          name,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async rebuildIndex(name: string): Promise<boolean> {
    return await this.executeWithMetrics('index.rebuild', async () => {
      try {
        const sql = `REINDEX INDEX CONCURRENTLY ${name}`;
        
        await this.poolService.executeQuery('main', sql);
        
        this.logger.info('Index rebuilt successfully', { name });

        this.metrics.incrementCounter('index.rebuilt', { name });

        return true;

      } catch (error) {
        this.logger.error('Failed to rebuild index', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('index.rebuild_failed', {
          name,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async analyzeIndex(name: string): Promise<boolean> {
    return await this.executeWithMetrics('index.analyze', async () => {
      try {
        const sql = `ANALYZE ${name}`;
        
        await this.poolService.executeQuery('main', sql);
        
        this.logger.info('Index analyzed successfully', { name });

        this.metrics.incrementCounter('index.analyzed', { name });

        return true;

      } catch (error) {
        this.logger.error('Failed to analyze index', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('index.analyze_failed', {
          name,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async getIndexMetrics(name: string): Promise<IndexMetrics | null> {
    return await this.executeWithMetrics('index.get_metrics', async () => {
      try {
        const sql = `
          SELECT 
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as size,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
          FROM pg_stat_user_indexes 
          WHERE indexname = $1
        `;
        
        const result = await this.poolService.executeQuery<{
          schemaname: string;
          tablename: string;
          indexname: string;
          size: string;
          scans: number;
          tuples_read: number;
          tuples_fetched: number;
        }>('main', sql, [name]);

        if (result.length === 0) {
          return null;
        }

        const row = result[0];
        const metrics: IndexMetrics = {
          name: row?.indexname || '',
          table: row?.tablename || '',
          size: this.parseSize(row?.size || '0'),
          usage: {
            scans: row?.scans || 0,
            tuplesRead: row?.tuples_read || 0,
            tuplesFetched: row?.tuples_fetched || 0
          },
          efficiency: {
            hitRate: (row?.tuples_read || 0) > 0 ? (row?.tuples_fetched || 0) / (row?.tuples_read || 1) : 0,
            avgScanTime: 0 // Would need additional monitoring
          },
          maintenance: {
            lastAnalyzed: new Date(), // Would need to track this
            lastVacuumed: new Date(), // Would need to track this
            bloatRatio: 0 // Would need to calculate this
          }
        };

        this.indexMetrics.set(name, metrics);
        return metrics;

      } catch (error) {
        this.logger.error('Failed to get index metrics', {
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return null;
      }
    });
  }

  async getAllIndexMetricsFromDB(): Promise<IndexMetrics[]> {
    return await this.executeWithMetrics('index.get_all_metrics', async () => {
      try {
        const sql = `
          SELECT 
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as size,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
          FROM pg_stat_user_indexes 
          ORDER BY idx_scan DESC
        `;
        
        const result = await this.poolService.executeQuery<{
          schemaname: string;
          tablename: string;
          indexname: string;
          size: string;
          scans: number;
          tuples_read: number;
          tuples_fetched: number;
        }>('main', sql);

        const metrics: IndexMetrics[] = result.map(row => ({
          name: row.indexname,
          table: row.tablename,
          size: this.parseSize(row.size),
          usage: {
            scans: row.scans,
            tuplesRead: row.tuples_read,
            tuplesFetched: row.tuples_fetched
          },
          efficiency: {
            hitRate: row.tuples_read > 0 ? row.tuples_fetched / row.tuples_read : 0,
            avgScanTime: 0
          },
          maintenance: {
            lastAnalyzed: new Date(),
            lastVacuumed: new Date(),
            bloatRatio: 0
          }
        }));

        this.metrics.incrementCounter('index.metrics_retrieved', {
          count: metrics.length.toString()
        });

        return metrics;

      } catch (error) {
        this.logger.error('Failed to get all index metrics', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return [];
      }
    });
  }

  async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    return await this.executeWithMetrics('index.get_recommendations', async () => {
      try {
        const sql = `
          SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation,
            most_common_vals,
            most_common_freqs
          FROM pg_stats 
          WHERE schemaname = 'public'
          AND n_distinct > 100
          ORDER BY n_distinct DESC
        `;
        
        const result = await this.poolService.executeQuery<{
          schemaname: string;
          tablename: string;
          attname: string;
          n_distinct: number;
          correlation: number;
          most_common_vals: string;
          most_common_freqs: string;
        }>('main', sql);

        const recommendations: IndexRecommendation[] = result.map(row => ({
          table: row.tablename,
          columns: [row.attname],
          type: 'btree',
          reason: `High cardinality column (${row.n_distinct} distinct values)`,
          priority: row.n_distinct > 1000 ? 'high' : 'medium',
          estimatedBenefit: Math.min(row.n_distinct / 1000, 1)
        }));

        this.metrics.incrementCounter('index.recommendations_generated', {
          count: recommendations.length.toString()
        });

        return recommendations;

      } catch (error) {
        this.logger.error('Failed to get index recommendations', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return [];
      }
    });
  }

  async optimizeIndexes(): Promise<boolean> {
    return await this.executeWithMetrics('index.optimize', async () => {
      try {
        const recommendations = await this.getIndexRecommendations();
        let optimizedCount = 0;

        for (const recommendation of recommendations) {
          if (recommendation.priority === 'high') {
            const created = await this.createIndex({
              name: `idx_${recommendation.table}_${recommendation.columns.join('_')}`,
              table: recommendation.table,
              columns: recommendation.columns,
              type: recommendation.type as 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin',
              unique: false,
              concurrent: true
            });
            if (created) {
              optimizedCount++;
            }
          }
        }

        this.logger.info('Index optimization completed', {
          recommendationsCount: recommendations.length,
          optimizedCount
        });

        this.metrics.incrementCounter('index.optimized', {
          optimizedCount: optimizedCount.toString()
        });

        return true;

      } catch (error) {
        this.logger.error('Failed to optimize indexes', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
      }
    });
  }

  async getUnusedIndexes(): Promise<string[]> {
    return await this.executeWithMetrics('index.get_unused', async () => {
      try {
        const sql = `
          SELECT indexname
          FROM pg_stat_user_indexes 
          WHERE idx_scan = 0
          AND indexname NOT LIKE '%_pkey'
        `;
        
        const result = await this.poolService.executeQuery<{ indexname: string }>('main', sql);
        
        const unusedIndexes = result.map(row => row.indexname);
        
        this.logger.info('Unused indexes found', {
          count: unusedIndexes.length,
          indexes: unusedIndexes
        });

        this.metrics.incrementCounter('index.unused_found', {
          count: unusedIndexes.length.toString()
        });

        return unusedIndexes;

      } catch (error) {
        this.logger.error('Failed to get unused indexes', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return [];
      }
    });
  }

  async cleanupUnusedIndexes(): Promise<number> {
    return await this.executeWithMetrics('index.cleanup_unused', async () => {
      try {
        const unusedIndexes = await this.getUnusedIndexes();
        let cleanedCount = 0;

        for (const indexName of unusedIndexes) {
          const dropped = await this.dropIndex(indexName, true);
          if (dropped) {
            cleanedCount++;
          }
        }

        this.logger.info('Unused indexes cleaned up', {
          cleanedCount,
          totalUnused: unusedIndexes.length
        });

        this.metrics.incrementCounter('index.cleanup_completed', {
          cleanedCount: cleanedCount.toString()
        });

        return cleanedCount;

      } catch (error) {
        this.logger.error('Failed to cleanup unused indexes', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return 0;
      }
    });
  }

  private buildCreateIndexSQL(definition: IndexDefinition): string {
    const uniqueClause = definition.unique ? 'UNIQUE' : '';
    const concurrentClause = definition.concurrent ? 'CONCURRENTLY' : '';
    const partialClause = definition.partial ? `WHERE ${definition.partial}` : '';
    const includeClause = definition.include ? `INCLUDE (${definition.include.join(', ')})` : '';
    const fillfactorClause = definition.fillfactor ? `WITH (fillfactor = ${definition.fillfactor})` : '';
    const tablespaceClause = definition.tablespace ? `TABLESPACE ${definition.tablespace}` : '';

    return `
      CREATE ${uniqueClause} INDEX ${concurrentClause} ${definition.name}
      ON ${definition.table} USING ${definition.type}
      (${definition.columns.join(', ')})
      ${includeClause}
      ${partialClause}
      ${fillfactorClause}
      ${tablespaceClause}
    `.trim().replace(/\s+/g, ' ');
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)?/);
    if (!match) return 0;

    const value = parseFloat(match[1] || '0');
    const unit = match[2] || 'B';

    switch (unit) {
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      case 'TB': return value * 1024 * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  getIndexDefinitions(): IndexDefinition[] {
    return Array.from(this.indexDefinitions.values());
  }

  getAllIndexMetrics(): IndexMetrics[] {
    return Array.from(this.indexMetrics.values());
  }

  hasIndex(name: string): boolean {
    return this.indexDefinitions.has(name);
  }

  getIndexDefinition(name: string): IndexDefinition | undefined {
    return this.indexDefinitions.get(name);
  }
}
