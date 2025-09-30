import { CacheConfig, CacheLevel, CacheStrategy, CacheMetrics, CacheOperation } from './types';
import { L1MemoryCache } from './l1-memory-cache';
import { L2RedisCache } from './l2-redis-cache';
import pino from 'pino';

export class MultiLevelCache {
  private l1Cache: L1MemoryCache;
  private l2Cache: L2RedisCache;
  private config: CacheConfig;
  private logger: pino.Logger;

  constructor(config: CacheConfig, redisUrl?: string) {
    this.config = config;
    this.logger = pino({
      level: process.env['LOG_LEVEL'] || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });

    this.l1Cache = new L1MemoryCache({
      ...config,
      level: CacheLevel.L1_MEMORY,
    });

    this.l2Cache = new L2RedisCache(
      {
        ...config,
        level: CacheLevel.L2_REDIS,
      },
      redisUrl
    );
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const l1Value = await this.l1Cache.get<T>(key);
      if (l1Value !== null) {
        this.logger.debug({ key, level: 'L1' }, 'Cache hit in L1');
        return l1Value;
      }

      const l2Value = await this.l2Cache.get<T>(key);
      if (l2Value !== null) {
        this.logger.debug({ key, level: 'L2' }, 'Cache hit in L2');
        await this.l1Cache.set(key, l2Value);
        return l2Value;
      }

      this.logger.debug({ key }, 'Cache miss in all levels');
      return null;
    } catch (error) {
      this.logger.error({ key, error }, 'Multi-level cache get error');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      switch (this.config.strategy) {
        case CacheStrategy.WRITE_THROUGH:
          return await this.writeThrough(key, value, ttl);
        case CacheStrategy.WRITE_BEHIND:
          return await this.writeBehind(key, value, ttl);
        case CacheStrategy.WRITE_AROUND:
          return await this.writeAround(key, value, ttl);
        case CacheStrategy.CACHE_ASIDE:
          return await this.cacheAside(key, value, ttl);
        default:
          return await this.writeThrough(key, value, ttl);
      }
    } catch (error) {
      this.logger.error({ key, error }, 'Multi-level cache set error');
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const l1Result = await this.l1Cache.delete(key);
      const l2Result = await this.l2Cache.delete(key);

      this.logger.debug({ key, l1Result, l2Result }, 'Cache delete operation');
      return l1Result || l2Result;
    } catch (error) {
      this.logger.error({ key, error }, 'Multi-level cache delete error');
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await Promise.all([this.l1Cache.clear(), this.l2Cache.clear()]);

      this.logger.info('Multi-level cache cleared');
    } catch (error) {
      this.logger.error({ error }, 'Multi-level cache clear error');
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results: (T | null)[] = new Array(keys.length);
      const missingKeys: number[] = [];

      for (let i = 0; i < keys.length; i++) {
        const l1Value = await this.l1Cache.get<T>(keys[i]!);
        if (l1Value !== null) {
          results[i] = l1Value;
        } else {
          missingKeys.push(i);
        }
      }

      if (missingKeys.length > 0) {
        const missingKeysList = missingKeys
          .map(i => keys[i])
          .filter((key): key is string => typeof key === 'string');
        const l2Values = await this.l2Cache.mget<T>(missingKeysList);

        for (let i = 0; i < missingKeys.length; i++) {
          const keyIndex = missingKeys[i];
          const value = l2Values[i];

          if (value !== null && keyIndex !== undefined) {
            results[keyIndex] = value as T;
            const key = keys[keyIndex];
            if (key) {
              await this.l1Cache.set(key, value);
            }
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error({ keys, error }, 'Multi-level cache mget error');
      return keys.map(() => null);
    }
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      switch (this.config.strategy) {
        case CacheStrategy.WRITE_THROUGH:
          return await this.msetWriteThrough(entries);
        case CacheStrategy.WRITE_BEHIND:
          return await this.msetWriteBehind(entries);
        case CacheStrategy.WRITE_AROUND:
          return await this.msetWriteAround(entries);
        case CacheStrategy.CACHE_ASIDE:
          return await this.msetCacheAside(entries);
        default:
          return await this.msetWriteThrough(entries);
      }
    } catch (error) {
      this.logger.error({ entries, error }, 'Multi-level cache mset error');
      return false;
    }
  }

  async invalidate(pattern: string): Promise<number> {
    try {
      let invalidated = 0;

      const l1Keys = Array.from(
        (this.l1Cache as unknown as { cache: Map<string, unknown> }).cache.keys()
      ).filter(
        (key: unknown): key is string =>
          typeof key === 'string' && this.matchesPattern(key, pattern)
      );

      for (const key of l1Keys) {
        if (typeof key === 'string') {
          await this.l1Cache.delete(key);
          invalidated++;
        }
      }

      const l2Pattern = `${this.config.namespace}:${pattern}`;
      const l2Keys = await (
        this.l2Cache as unknown as { redis: { keys: (pattern: string) => Promise<string[]> } }
      ).redis.keys(l2Pattern);

      if (l2Keys.length > 0) {
        await (
          this.l2Cache as unknown as { redis: { del: (...keys: string[]) => Promise<number> } }
        ).redis.del(...l2Keys);
        invalidated += l2Keys.length;
      }

      this.logger.info({ pattern, invalidated }, 'Cache invalidation completed');
      return invalidated;
    } catch (error) {
      this.logger.error({ pattern, error }, 'Cache invalidation error');
      return 0;
    }
  }

  getMetrics(): { l1: CacheMetrics; l2: CacheMetrics; combined: CacheMetrics } {
    const l1Metrics = this.l1Cache.getMetrics();
    const l2Metrics = this.l2Cache.getMetrics();

    const combined: CacheMetrics = {
      hits: l1Metrics.hits + l2Metrics.hits,
      misses: l1Metrics.misses + l2Metrics.misses,
      hitRate: 0,
      evictions: l1Metrics.evictions + l2Metrics.evictions,
      size: l1Metrics.size + l2Metrics.size,
      maxSize: l1Metrics.maxSize + l2Metrics.maxSize,
      memoryUsage: l1Metrics.memoryUsage + l2Metrics.memoryUsage,
      averageAccessTime: (l1Metrics.averageAccessTime + l2Metrics.averageAccessTime) / 2,
    };

    const total = combined.hits + combined.misses;
    combined.hitRate = total > 0 ? combined.hits / total : 0;

    return { l1: l1Metrics, l2: l2Metrics, combined };
  }

  getOperations(limit: number = 100): CacheOperation[] {
    const l1Ops = this.l1Cache.getOperations(limit);
    const l2Ops = this.l2Cache.getOperations(limit);

    return [...l1Ops, ...l2Ops].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async shutdown(): Promise<void> {
    try {
      await this.l2Cache.shutdown();
      this.logger.info('Multi-level cache shutdown complete');
    } catch (error) {
      this.logger.error({ error }, 'Multi-level cache shutdown error');
    }
  }

  private async writeThrough<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const l1Result = await this.l1Cache.set(key, value, ttl);
    const l2Result = await this.l2Cache.set(key, value, ttl);
    return l1Result && l2Result;
  }

  private async writeBehind<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const l1Result = await this.l1Cache.set(key, value, ttl);

    setImmediate(async () => {
      await this.l2Cache.set(key, value, ttl);
    });

    return l1Result;
  }

  private async writeAround<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    return await this.l2Cache.set(key, value, ttl);
  }

  private async cacheAside<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const l2Result = await this.l2Cache.set(key, value, ttl);
    return l2Result;
  }

  private async msetWriteThrough<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<boolean> {
    const l2Result = await this.l2Cache.mset(entries);

    for (const { key, value, ttl } of entries) {
      await this.l1Cache.set(key, value, ttl);
    }

    return l2Result;
  }

  private async msetWriteBehind<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<boolean> {
    for (const { key, value, ttl } of entries) {
      await this.l1Cache.set(key, value, ttl);
    }

    setImmediate(async () => {
      await this.l2Cache.mset(entries);
    });

    return true;
  }

  private async msetWriteAround<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<boolean> {
    return await this.l2Cache.mset(entries);
  }

  private async msetCacheAside<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<boolean> {
    return await this.l2Cache.mset(entries);
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }
}
