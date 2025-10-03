import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { CacheService } from '../cache/cache.service';

export interface Query {
  id: string;
  type: string;
  data: unknown;
  metadata: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
}

export interface QueryHandler<TQuery extends Query = Query, TResult = unknown> {
  queryType: string;
  handle: (_query: TQuery) => Promise<TResult>;
}

export interface QueryResult<T = unknown> {
  success: boolean;
  data: T;
  metadata: Record<string, unknown>;
  timestamp: Date;
  error?: string;
}

@injectable()
export class QueryService extends BaseService {
  private readonly handlers: Map<string, QueryHandler[]> = new Map();

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    private readonly _cache: CacheService
  ) {
    super(logger, metrics);
  }

  async registerHandler<TQuery extends Query, TResult>(
    handler: QueryHandler<TQuery, TResult>
  ): Promise<void> {
    await this.executeWithMetrics('query.register_handler', async () => {
      if (!this.handlers.has(handler.queryType)) {
        this.handlers.set(handler.queryType, []);
      }

      this.handlers.get(handler.queryType)!.push(handler as QueryHandler<Query, unknown>);

      this.logger.info('Query handler registered', {
        queryType: handler.queryType
      });

      this.metrics.incrementCounter('query.handlers.registered', {
        queryType: handler.queryType
      });
    });
  }

  async execute<TQuery extends Query, TResult>(
    query: TQuery,
    useCache: boolean = true,
    cacheTTL: number = 300
  ): Promise<QueryResult<TResult>> {
    return await this.executeWithMetrics('query.execute', async () => {
      const handlers = this.handlers.get(query.type) || [];
      
      if (handlers.length === 0) {
        throw new Error(`No handlers found for query type: ${query.type}`);
      }

      // Check cache first
      if (useCache) {
        const cachedResult = await this.getCachedResult<TResult>(query);
        if (cachedResult) {
          this.logger.debug('Query result served from cache', {
            queryId: query.id,
            queryType: query.type
          });

          this.metrics.incrementCounter('query.cache.hit', {
            queryType: query.type
          });

          return {
            success: true,
            data: cachedResult,
            metadata: {
              cached: true,
              queryId: query.id
            },
            timestamp: new Date()
          };
        }
      }

      let success = true;
      let data: TResult | undefined;
      let error: string | undefined;

      try {
        // Execute the first handler (queries typically have one handler)
        const handler = handlers[0] as QueryHandler<TQuery, TResult>;
        data = await this.executeHandler(handler, query);

        // Cache the result
        if (useCache && data) {
          await this.cacheResult(query, data, cacheTTL);
        }

        this.logger.info('Query executed successfully', {
          queryId: query.id,
          queryType: query.type,
          cached: false
        });

        this.metrics.incrementCounter('query.executed.success', {
          queryType: query.type
        });

      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        
        this.logger.error('Query execution failed', {
          queryId: query.id,
          queryType: query.type,
          error
        });

        this.metrics.incrementCounter('query.executed.error', {
          queryType: query.type,
          error: err instanceof Error ? err.name : 'Unknown'
        });
      }

      return {
        success,
        data: data as TResult,
        metadata: {
          cached: false,
          queryId: query.id
        },
        timestamp: new Date(),
        error: error ?? ''
      };
    });
  }

  private async executeHandler<TQuery extends Query, TResult>(
    handler: QueryHandler<TQuery, TResult>,
    query: TQuery
  ): Promise<TResult> {
    try {
      return await this.executeWithMetrics('query.handler.execute', async () => {
        return await handler.handle(query);
      });

    } catch (error) {
      this.logger.error('Query handler failed', {
        queryId: query.id,
        queryType: query.type,
        handlerQueryType: handler.queryType,
        error
      });

      this.metrics.incrementCounter('query.handlers.error', {
        queryType: query.type,
        handlerQueryType: handler.queryType,
        error: error instanceof Error ? error.name : 'Unknown'
      });

      throw error;
    }
  }

  private async getCachedResult<T>(query: Query): Promise<T | null> {
    try {
      const cacheKey = this.generateCacheKey(query);
      return await this._cache.get<T>(cacheKey);
    } catch (error) {
      this.logger.warn('Failed to get cached query result', {
        queryId: query.id,
        queryType: query.type,
        error
      });
      return null;
    }
  }

  private async cacheResult<T>(query: Query, result: T, ttl: number): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query);
      await this._cache.set(cacheKey, result, ttl);
    } catch (error) {
      this.logger.warn('Failed to cache query result', {
        queryId: query.id,
        queryType: query.type,
        error
      });
    }
  }

  private generateCacheKey(query: Query): string {
    const queryData = JSON.stringify(query.data);
    return `query:${query.type}:${Buffer.from(queryData).toString('base64')}`;
  }

  createQuery(
    type: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    userId?: string,
    correlationId?: string
  ): Query {
    return {
      id: this.generateQueryId(),
      type,
      data,
      metadata,
      timestamp: new Date(),
      userId: userId ?? '',
      correlationId: correlationId ?? ''
    };
  }

  private generateQueryId(): string {
    return `qry_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async invalidateCache(queryType: string, pattern?: string): Promise<void> {
    await this.executeWithMetrics('query.cache.invalidate', async () => {
      if (pattern) {
        await this._cache.delete(`query:${queryType}:${pattern}`);
      } else {
        await this._cache.delete(`query:${queryType}:*`);
      }

      this.logger.info('Query cache invalidated', {
        queryType,
        pattern
      });

      this.metrics.incrementCounter('query.cache.invalidated', {
        queryType
      });
    });
  }

  getRegisteredHandlers(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [queryType, handlers] of this.handlers) {
      result[queryType] = handlers.length;
    }
    return result;
  }
}
