import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { RedisCacheService } from './redis-cache.service';
import { MemoryCacheService } from './memory-cache.service';

export interface MultiLevelCacheConfig {
  enableL1: boolean; // Memory cache
  enableL2: boolean; // Redis cache
  l1MaxSize: number;
  l1Ttl: number;
  l2Ttl: number;
  writeThrough: boolean; // Write to both levels
  writeBack: boolean; // Write to L1 first, then L2
  readThrough: boolean; // Read from L1, fallback to L2
  cacheMissStrategy: 'l1_only' | 'l2_only' | 'both';
}

export interface CacheLevel {
  name: string;
  enabled: boolean;
  service: unknown;
  priority: number;
}

export interface MultiLevelCacheMetrics {
  l1: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    size: number;
    maxSize: number;
    hitRate: number;
  };
  l2: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
  };
  combined: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
  };
}

@injectable()
export class MultiLevelCacheService extends BaseService {
  private readonly config: MultiLevelCacheConfig;
  private readonly levels: CacheLevel[];
  private readonly multiLevelMetrics: MultiLevelCacheMetrics;

  constructor(
    logger: LoggerService,
    metrics: MetricsService,
    private readonly _memoryCache: MemoryCacheService,
    private readonly _redisCache: RedisCacheService
  ) {
    super(logger, metrics);
    
    this.config = {
      enableL1: process.env.MULTI_LEVEL_CACHE_L1_ENABLED !== 'false',
      enableL2: process.env.MULTI_LEVEL_CACHE_L2_ENABLED !== 'false',
      l1MaxSize: Number(process.env.MULTI_LEVEL_CACHE_L1_MAX_SIZE) || 1000,
      l1Ttl: Number(process.env.MULTI_LEVEL_CACHE_L1_TTL) || 300000, // 5 minutes
      l2Ttl: Number(process.env.MULTI_LEVEL_CACHE_L2_TTL) || 1800000, // 30 minutes
      writeThrough: process.env.MULTI_LEVEL_CACHE_WRITE_THROUGH === 'true',
      writeBack: process.env.MULTI_LEVEL_CACHE_WRITE_BACK === 'true',
      readThrough: process.env.MULTI_LEVEL_CACHE_READ_THROUGH === 'true',
      cacheMissStrategy: (process.env.MULTI_LEVEL_CACHE_MISS_STRATEGY as 'l1_only' | 'l2_only' | 'both') || 'both'
    };

    this.multiLevelMetrics = {
      l1: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        maxSize: this.config.l1MaxSize,
        hitRate: 0
      },
      l2: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0
      },
      combined: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0
      }
    };

    this.levels = [
      {
        name: 'L1',
        enabled: this.config.enableL1,
        service: this._memoryCache,
        priority: 1
      },
      {
        name: 'L2',
        enabled: this.config.enableL2,
        service: this._redisCache,
        priority: 2
      }
    ];

    this.logger.info('Multi-level cache initialized', {
      l1Enabled: this.config.enableL1,
      l2Enabled: this.config.enableL2,
      writeThrough: this.config.writeThrough,
      writeBack: this.config.writeBack,
      readThrough: this.config.readThrough
    });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return await this.executeWithMetrics('multi_level_cache.get', async () => {
      try {
        // Try L1 first if enabled
        if (this.config.enableL1) {
          const l1Value = await this._memoryCache.get<T>(key);
          if (l1Value !== null) {
            this.multiLevelMetrics.l1.hits++;
            this.multiLevelMetrics.combined.hits++;
            this.updateHitRates();
            
            this.logger.debug('Cache hit in L1', { key });
            this.metrics.incrementCounter('multi_level_cache.l1_hit', { key });
            return l1Value;
          } else {
            this.multiLevelMetrics.l1.misses++;
            this.logger.debug('Cache miss in L1', { key });
          }
        }

        // Try L2 if enabled
        if (this.config.enableL2) {
          const l2Value = await this._redisCache.get<T>(key);
          if (l2Value !== null) {
            this.multiLevelMetrics.l2.hits++;
            this.multiLevelMetrics.combined.hits++;
            this.updateHitRates();
            
            // If read-through is enabled, populate L1
            if (this.config.readThrough && this.config.enableL1) {
              await this._memoryCache.set(key, l2Value, { ttl: this.config.l1Ttl });
            }
            
            this.logger.debug('Cache hit in L2', { key });
            this.metrics.incrementCounter('multi_level_cache.l2_hit', { key });
            return l2Value;
          } else {
            this.multiLevelMetrics.l2.misses++;
            this.logger.debug('Cache miss in L2', { key });
          }
        }

        // Complete miss
        this.multiLevelMetrics.combined.misses++;
        this.updateHitRates();
        
        this.logger.debug('Cache miss in all levels', { key });
        this.metrics.incrementCounter('multi_level_cache.miss', { key });
        return null;

      } catch (error) {
        this.logger.error('Multi-level cache get failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('multi_level_cache.get_failed', {
          key,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return null;
      }
    });
  }

  async set<T = unknown>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
      level?: 'l1' | 'l2' | 'both';
    } = {}
  ): Promise<boolean> {
    return await this.executeWithMetrics('multi_level_cache.set', async () => {
      try {
        const level = options.level || 'both';
        const ttl = options.ttl;
        const tags = options.tags;
        let success = true;

        // Write to L1 if enabled and requested
        if (this.config.enableL1 && (level === 'l1' || level === 'both')) {
          const l1Success = await this._memoryCache.set(key, value, {
            ttl: ttl || this.config.l1Ttl,
            tags: tags || []
          });
          
          if (l1Success) {
            this.multiLevelMetrics.l1.sets++;
            this.logger.debug('Value set in L1', { key });
          } else {
            success = false;
            this.logger.warn('Failed to set value in L1', { key });
          }
        }

        // Write to L2 if enabled and requested
        if (this.config.enableL2 && (level === 'l2' || level === 'both')) {
          const l2Success = await this._redisCache.set(key, value, {
            ttl: ttl || this.config.l2Ttl,
            tags: tags || []
          });
          
          if (l2Success) {
            this.multiLevelMetrics.l2.sets++;
            this.logger.debug('Value set in L2', { key });
          } else {
            success = false;
            this.logger.warn('Failed to set value in L2', { key });
          }
        }

        if (success) {
          this.multiLevelMetrics.combined.sets++;
          this.metrics.incrementCounter('multi_level_cache.set', { key });
        }

        return success;

      } catch (error) {
        this.logger.error('Multi-level cache set failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('multi_level_cache.set_failed', {
          key,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async delete(key: string): Promise<boolean> {
    return await this.executeWithMetrics('multi_level_cache.delete', async () => {
      try {
        const success = true;

        // Delete from L1 if enabled
        if (this.config.enableL1) {
          const l1Success = await this._memoryCache.delete(key);
          if (l1Success) {
            this.multiLevelMetrics.l1.deletes++;
            this.logger.debug('Value deleted from L1', { key });
          }
        }

        // Delete from L2 if enabled
        if (this.config.enableL2) {
          const l2Success = await this._redisCache.delete(key);
          if (l2Success) {
            this.multiLevelMetrics.l2.deletes++;
            this.logger.debug('Value deleted from L2', { key });
          }
        }

        this.multiLevelMetrics.combined.deletes++;
        this.metrics.incrementCounter('multi_level_cache.delete', { key });

        return success;

      } catch (error) {
        this.logger.error('Multi-level cache delete failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('multi_level_cache.delete_failed', {
          key,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async exists(key: string): Promise<boolean> {
    return await this.executeWithMetrics('multi_level_cache.exists', async () => {
      try {
        // Check L1 first if enabled
        if (this.config.enableL1) {
          const l1Exists = await this._memoryCache.exists(key);
          if (l1Exists) {
            return true;
          }
        }

        // Check L2 if enabled
        if (this.config.enableL2) {
          const l2Exists = await this._redisCache.exists(key);
          if (l2Exists) {
            return true;
          }
        }

        return false;

      } catch (error) {
        this.logger.error('Multi-level cache exists check failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
      }
    });
  }

  async getMultiple<T = unknown>(keys: string[]): Promise<Record<string, T | null>> {
    return await this.executeWithMetrics('multi_level_cache.get_multiple', async () => {
      try {
        const result: Record<string, T | null> = {};
        const missingKeys: string[] = [];

        // Try L1 first if enabled
        if (this.config.enableL1) {
          const l1Results = await this._memoryCache.getMultiple<T>(keys);
          
          keys.forEach(key => {
            if (l1Results[key] !== null && l1Results[key] !== undefined) {
              result[key] = l1Results[key]!;
              this.multiLevelMetrics.l1.hits++;
            } else {
              missingKeys.push(key);
            }
          });
        } else {
          missingKeys.push(...keys);
        }

        // Try L2 for missing keys if enabled
        if (this.config.enableL2 && missingKeys.length > 0) {
          const l2Results = await this._redisCache.getMultiple<T>(missingKeys);
          
          missingKeys.forEach(key => {
            if (l2Results[key] !== null && l2Results[key] !== undefined) {
              result[key] = l2Results[key]!;
              this.multiLevelMetrics.l2.hits++;
              
              // If read-through is enabled, populate L1
              if (this.config.readThrough && this.config.enableL1) {
                this._memoryCache.set(key, l2Results[key], { ttl: this.config.l1Ttl });
              }
            } else {
              result[key] = null;
              this.multiLevelMetrics.l2.misses++;
            }
          });
        } else {
          missingKeys.forEach(key => {
            result[key] = null;
            this.multiLevelMetrics.l1.misses++;
          });
        }

        this.multiLevelMetrics.combined.hits += Object.values(result).filter(v => v !== null).length;
        this.multiLevelMetrics.combined.misses += Object.values(result).filter(v => v === null).length;
        this.updateHitRates();

        this.metrics.incrementCounter('multi_level_cache.get_multiple', {
          keysCount: keys.length.toString()
        });

        return result;

      } catch (error) {
        this.logger.error('Multi-level cache get multiple failed', {
          keys,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Return null for all keys on error
        const result: Record<string, T | null> = {};
        keys.forEach(key => result[key] = null);
        return result;
      }
    });
  }

  async setMultiple<T = unknown>(
    data: Record<string, T>,
    options: {
      ttl?: number;
      tags?: string[];
      level?: 'l1' | 'l2' | 'both';
    } = {}
  ): Promise<boolean> {
    return await this.executeWithMetrics('multi_level_cache.set_multiple', async () => {
      try {
        const level = options.level || 'both';
        const ttl = options.ttl;
        const tags = options.tags;
        let success = true;

        // Write to L1 if enabled and requested
        if (this.config.enableL1 && (level === 'l1' || level === 'both')) {
          const l1Success = await this._memoryCache.setMultiple(data, {
            ttl: ttl || this.config.l1Ttl,
            tags: tags || []
          });
          
          if (l1Success) {
            this.multiLevelMetrics.l1.sets += Object.keys(data).length;
            this.logger.debug('Values set in L1', { keysCount: Object.keys(data).length });
          } else {
            success = false;
            this.logger.warn('Failed to set values in L1', { keysCount: Object.keys(data).length });
          }
        }

        // Write to L2 if enabled and requested
        if (this.config.enableL2 && (level === 'l2' || level === 'both')) {
          const l2Success = await this._redisCache.setMultiple(data, {
            ttl: ttl || this.config.l2Ttl,
            tags: tags || []
          });
          
          if (l2Success) {
            this.multiLevelMetrics.l2.sets += Object.keys(data).length;
            this.logger.debug('Values set in L2', { keysCount: Object.keys(data).length });
          } else {
            success = false;
            this.logger.warn('Failed to set values in L2', { keysCount: Object.keys(data).length });
          }
        }

        if (success) {
          this.multiLevelMetrics.combined.sets += Object.keys(data).length;
        this.metrics.incrementCounter('multi_level_cache.set_multiple', {
          keysCount: Object.keys(data).length.toString()
        });
        }

        return success;

      } catch (error) {
        this.logger.error('Multi-level cache set multiple failed', {
          keys: Object.keys(data),
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
      }
    });
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    return await this.executeWithMetrics('multi_level_cache.delete_multiple', async () => {
      try {
        let deletedCount = 0;

        // Delete from L1 if enabled
        if (this.config.enableL1) {
          const l1Deleted = await this._memoryCache.deleteMultiple(keys);
          this.multiLevelMetrics.l1.deletes += l1Deleted;
          deletedCount = Math.max(deletedCount, l1Deleted);
        }

        // Delete from L2 if enabled
        if (this.config.enableL2) {
          const l2Deleted = await this._redisCache.deleteMultiple(keys);
          this.multiLevelMetrics.l2.deletes += l2Deleted;
          deletedCount = Math.max(deletedCount, l2Deleted);
        }

        this.multiLevelMetrics.combined.deletes += deletedCount;
        this.metrics.incrementCounter('multi_level_cache.delete_multiple', {
          keysCount: keys.length.toString(),
          deletedCount: deletedCount.toString()
        });

        return deletedCount;

      } catch (error) {
        this.logger.error('Multi-level cache delete multiple failed', {
          keys,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return 0;
      }
    });
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    return await this.executeWithMetrics('multi_level_cache.invalidate_by_tags', async () => {
      try {
        let deletedCount = 0;

        // Invalidate in L1 if enabled
        if (this.config.enableL1) {
          const l1Deleted = await this._memoryCache.invalidateByTags(tags);
          deletedCount = Math.max(deletedCount, l1Deleted);
        }

        // Invalidate in L2 if enabled
        if (this.config.enableL2) {
          const l2Deleted = await this._redisCache.invalidateByTags(tags);
          deletedCount = Math.max(deletedCount, l2Deleted);
        }

        this.metrics.incrementCounter('multi_level_cache.invalidated_by_tags', {
          tagsCount: tags.length.toString(),
          deletedCount: deletedCount.toString()
        });

        return deletedCount;

      } catch (error) {
        this.logger.error('Multi-level cache invalidate by tags failed', {
          tags,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return 0;
      }
    });
  }

  async clear(): Promise<boolean> {
    return await this.executeWithMetrics('multi_level_cache.clear', async () => {
      try {
        let success = true;

        // Clear L1 if enabled
        if (this.config.enableL1) {
          const l1Success = await this._memoryCache.clear();
          if (!l1Success) {
            success = false;
          }
        }

        // Clear L2 if enabled
        if (this.config.enableL2) {
          const l2Success = await this._redisCache.clear();
          if (!l2Success) {
            success = false;
          }
        }

        this.logger.info('Multi-level cache cleared');
        this.metrics.incrementCounter('multi_level_cache.cleared');

        return success;

      } catch (error) {
        this.logger.error('Multi-level cache clear failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
      }
    });
  }

  async getMetrics(): Promise<MultiLevelCacheMetrics> {
    try {
      // Get individual level metrics
      if (this.config.enableL1) {
        const l1Metrics = await this._memoryCache.getMetrics();
        this.multiLevelMetrics.l1 = {
          hits: l1Metrics.hits,
          misses: l1Metrics.misses,
          sets: l1Metrics.sets,
          deletes: l1Metrics.deletes,
          size: l1Metrics.size,
          maxSize: l1Metrics.maxSize,
          hitRate: l1Metrics.hits / (l1Metrics.hits + l1Metrics.misses) || 0
        };
      }

      if (this.config.enableL2) {
        const l2Metrics = await this._redisCache.getMetrics();
        this.multiLevelMetrics.l2 = {
          hits: l2Metrics.hits,
          misses: l2Metrics.misses,
          sets: l2Metrics.sets,
          deletes: l2Metrics.deletes,
          hitRate: l2Metrics.hits / (l2Metrics.hits + l2Metrics.misses) || 0
        };
      }

      this.updateHitRates();

      return this.multiLevelMetrics;

    } catch (error) {
      this.logger.error('Failed to get multi-level cache metrics', { error });
      return this.multiLevelMetrics;
    }
  }

  private updateHitRates(): void {
    this.multiLevelMetrics.l1.hitRate = this.multiLevelMetrics.l1.hits / (this.multiLevelMetrics.l1.hits + this.multiLevelMetrics.l1.misses) || 0;
    this.multiLevelMetrics.l2.hitRate = this.multiLevelMetrics.l2.hits / (this.multiLevelMetrics.l2.hits + this.multiLevelMetrics.l2.misses) || 0;
    this.multiLevelMetrics.combined.hitRate = this.multiLevelMetrics.combined.hits / (this.multiLevelMetrics.combined.hits + this.multiLevelMetrics.combined.misses) || 0;
  }

  async healthCheck(): Promise<boolean> {
    try {
      let healthy = true;

      if (this.config.enableL1) {
        const l1Healthy = await this._memoryCache.healthCheck();
        if (!l1Healthy) {
          healthy = false;
        }
      }

      if (this.config.enableL2) {
        const l2Healthy = await this._redisCache.healthCheck();
        if (!l2Healthy) {
          healthy = false;
        }
      }

      return healthy;

    } catch (error) {
      this.logger.error('Multi-level cache health check failed', { error });
      return false;
    }
  }

  getConfig(): MultiLevelCacheConfig {
    return { ...this.config };
  }

  getLevels(): CacheLevel[] {
    return [...this.levels];
  }

  isHealthy(): boolean {
    let healthy = true;

    if (this.config.enableL1) {
      healthy = healthy && this._memoryCache.isHealthy();
    }

    if (this.config.enableL2) {
      healthy = healthy && this._redisCache.isHealthy();
    }

    return healthy;
  }
}
