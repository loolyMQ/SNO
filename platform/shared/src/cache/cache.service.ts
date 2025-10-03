import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  checkPeriod: number;
}

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  tags: string[];
}

@injectable()
export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(
    private readonly _logger: LoggerService,
    private readonly _metrics: MetricsService
  ) {
    this.config = {
      defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '3600000'), // 1 hour
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '60000') // 1 minute
    };
    
    this.startCleanupInterval();
    this._logger.info('CacheService initialized');
  }

  public async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this._metrics.incrementCounter('cache_misses_total', { key });
      return null;
    }
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.removeFromTagIndex(key, entry.tags);
      this._metrics.incrementCounter('cache_expired_total', { key });
      return null;
    }
    
    this._metrics.incrementCounter('cache_hits_total', { key });
    return entry.value as T;
  }

  public async set<T = unknown>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      tags: tags || []
    };
    
    this.cache.set(key, entry);
    
    if (tags) {
      tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)?.add(key);
      });
    }
    
    this._metrics.incrementCounter('cache_sets_total', { key });
    
    if (this.cache.size > this.config.maxSize) {
      await this.evictOldest();
    }
  }

  public async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.removeFromTagIndex(key, entry.tags);
      this._metrics.incrementCounter('cache_deletes_total', { key });
    }
  }

  public async invalidateTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of keys) {
        await this.delete(key);
      }
      this.tagIndex.delete(tag);
      this._metrics.incrementCounter('cache_tag_invalidations_total', { tag });
    }
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
    this._metrics.incrementCounter('cache_clears_total');
  }

  public async getStats(): Promise<{
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
  }> {
    const hits = this._metrics.getCounterValue('cache_hits_total') || 0;
    const misses = this._metrics.getCounterValue('cache_misses_total') || 0;
    const total = hits + misses;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: total > 0 ? hits / total : 0,
      missRate: total > 0 ? misses / total : 0
    };
  }

  private async evictOldest(): Promise<void> {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      await this.delete(oldestKey);
      this._metrics.incrementCounter('cache_evictions_total');
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    tags.forEach(tag => {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(key);
        if (tagKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt < now) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => {
        const entry = this.cache.get(key);
        if (entry) {
          this.cache.delete(key);
          this.removeFromTagIndex(key, entry.tags);
        }
      });
      
      if (expiredKeys.length > 0) {
        this._logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
        this._metrics.incrementCounter('cache_cleanup_total', { count: expiredKeys.length.toString() });
      }
    }, this.config.checkPeriod);
  }
}
