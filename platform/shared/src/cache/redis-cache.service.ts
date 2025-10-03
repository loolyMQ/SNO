import { injectable } from 'inversify';
import Redis, { RedisOptions } from 'ioredis';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string | undefined;
  db: number;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  connectTimeout: number;
  commandTimeout: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression
  serialize?: boolean; // Enable serialization
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  expires: number;
  memory: {
    used: number;
    peak: number;
    fragmentation: number;
  };
  connections: {
    active: number;
    idle: number;
  };
}

@injectable()
export class RedisCacheService extends BaseService {
  private redis!: Redis;
  private readonly config: RedisCacheConfig;
  private readonly cacheMetrics: CacheMetrics;
  private isConnected: boolean = false;

  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    super(logger, metrics);
    
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'science-map:',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000
    };

    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expires: 0,
      memory: {
        used: 0,
        peak: 0,
        fragmentation: 0
      },
      connections: {
        active: 0,
        idle: 0
      }
    };

    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisOptions: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      ...(this.config.password && { password: this.config.password }),
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      lazyConnect: this.config.lazyConnect,
      keepAlive: this.config.keepAlive,
      family: this.config.family,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout
    };

    this.redis = new Redis(redisOptions);

    // Event listeners
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.info('Redis connected', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      this.cacheMetrics.connections.active++;
      this.metrics.incrementCounter('redis.connections.established');
    });

    this.redis.on('ready', () => {
      this.logger.info('Redis ready for commands');
      this.metrics.incrementCounter('redis.ready');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis error', { error: error instanceof Error ? error.message : String(error) });
      this.metrics.incrementCounter('redis.errors', {
        error: error.name
      });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
      this.metrics.incrementCounter('redis.connections.closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.info('Redis reconnecting');
      this.metrics.incrementCounter('redis.reconnecting');
    });
  }

  async connect(): Promise<void> {
    await this.executeWithMetrics('cache.connect', async () => {
      if (!this.isConnected) {
        await this.redis.connect();
      }
    });
  }

  async disconnect(): Promise<void> {
    await this.executeWithMetrics('cache.disconnect', async () => {
      if (this.isConnected) {
        await this.redis.disconnect();
        this.isConnected = false;
      }
    });
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return await this.executeWithMetrics('cache.get', async () => {
      try {
        const value = await this.redis.get(key);
        
        if (value === null) {
          this.cacheMetrics.misses++;
          this.metrics.incrementCounter('cache.misses', { key });
          return null;
        }

        this.cacheMetrics.hits++;
        this.metrics.incrementCounter('cache.hits', { key });

        // Try to parse as JSON, fallback to string
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }

      } catch (error) {
        this.logger.error('Cache get failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('cache.get_failed', {
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
    options: CacheOptions = {}
  ): Promise<boolean> {
    return await this.executeWithMetrics('cache.set', async () => {
      try {
        let serializedValue: string;

        if (options.serialize !== false) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = String(value);
        }

        const args: (string | number)[] = [key, serializedValue];

        if (options.ttl) {
          args.push('EX', options.ttl);
        }

        if (options.tags && options.tags.length > 0) {
          // Store tags for this key
          await this.redis.sadd(`tags:${key}`, ...options.tags);
        }

        if (args.length > 2) {
          await this.redis.set(args[0] as string, args[1] as string, args[2] as 'EX', args[3] as number);
        } else {
          await this.redis.set(args[0] as string, args[1] as string);
        }
        
        this.cacheMetrics.sets++;
        this.metrics.incrementCounter('cache.sets', { key });

        return true;

      } catch (error) {
        this.logger.error('Cache set failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('cache.set_failed', {
          key,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async delete(key: string): Promise<boolean> {
    return await this.executeWithMetrics('cache.delete', async () => {
      try {
        const result = await this.redis.del(key);
        
        // Clean up tags
        await this.redis.del(`tags:${key}`);
        
        this.cacheMetrics.deletes++;
        this.metrics.incrementCounter('cache.deletes', { key });

        return result > 0;

      } catch (error) {
        this.logger.error('Cache delete failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('cache.delete_failed', {
          key,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        return false;
      }
    });
  }

  async exists(key: string): Promise<boolean> {
    return await this.executeWithMetrics('cache.exists', async () => {
      try {
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (error) {
        this.logger.error('Cache exists check failed', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }
    });
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    return await this.executeWithMetrics('cache.expire', async () => {
      try {
        const result = await this.redis.expire(key, ttl);
        
        if (result) {
          this.cacheMetrics.expires++;
          this.metrics.incrementCounter('cache.expires', { key });
        }

        return result === 1;
      } catch (error) {
        this.logger.error('Cache expire failed', {
          key,
          ttl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }
    });
  }

  async getMultiple<T = unknown>(keys: string[]): Promise<Record<string, T | null>> {
    return await this.executeWithMetrics('cache.get_multiple', async () => {
      try {
        const values = await this.redis.mget(...keys);
        const result: Record<string, T | null> = {};

        keys.forEach((key, index) => {
          const value = values[index];
          
          if (value === null) {
            result[key] = null;
            this.cacheMetrics.misses++;
          } else {
            try {
              result[key] = JSON.parse(value || '{}') as T;
              this.cacheMetrics.hits++;
            } catch {
              result[key] = value as T;
              this.cacheMetrics.hits++;
            }
          }
        });

        this.metrics.incrementCounter('cache.get_multiple', {
          keysCount: keys.length.toString()
        });

        return result;

      } catch (error) {
        this.logger.error('Cache get multiple failed', {
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
    options: CacheOptions = {}
  ): Promise<boolean> {
    return await this.executeWithMetrics('cache.set_multiple', async () => {
      try {
        const pipeline = this.redis.pipeline();

        Object.entries(data).forEach(([key, value]) => {
          let serializedValue: string;

          if (options.serialize !== false) {
            serializedValue = JSON.stringify(value);
          } else {
            serializedValue = String(value);
          }

          const args: (string | number)[] = [key, serializedValue];

          if (options.ttl) {
            args.push('EX', options.ttl);
          }

          if (args.length > 2) {
            pipeline.set(args[0] as string, args[1] as string, args[2] as 'EX', args[3] as number);
          } else {
            pipeline.set(args[0] as string, args[1] as string);
          }

          if (options.tags && options.tags.length > 0) {
            pipeline.sadd(`tags:${key}`, ...options.tags);
          }
        });

        await pipeline.exec();

        this.cacheMetrics.sets += Object.keys(data).length;
        this.metrics.incrementCounter('cache.set_multiple', {
          keysCount: Object.keys(data).length.toString()
        });

        return true;

      } catch (error) {
        this.logger.error('Cache set multiple failed', {
          keys: Object.keys(data),
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
      }
    });
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    return await this.executeWithMetrics('cache.delete_multiple', async () => {
      try {
        const result = await this.redis.del(...keys);
        
        // Clean up tags for deleted keys
        const tagKeys = keys.map(key => `tags:${key}`);
        if (tagKeys.length > 0) {
          await this.redis.del(...tagKeys);
        }

        this.cacheMetrics.deletes += result;
        this.metrics.incrementCounter('cache.delete_multiple', {
          keysCount: keys.length.toString(),
          deletedCount: result.toString()
        });

        return result;

      } catch (error) {
        this.logger.error('Cache delete multiple failed', {
          keys,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return 0;
      }
    });
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    return await this.executeWithMetrics('cache.invalidate_by_tags', async () => {
      try {
        let deletedCount = 0;

        for (const tag of tags) {
          const keys = await this.redis.smembers(`tag:${tag}`);
          
          if (keys.length > 0) {
            const result = await this.redis.del(...keys);
            deletedCount += result;
          }
        }

        this.metrics.incrementCounter('cache.invalidated_by_tags', {
          tagsCount: tags.length.toString(),
          deletedCount: deletedCount.toString()
        });

        return deletedCount;

      } catch (error) {
        this.logger.error('Cache invalidate by tags failed', {
          tags,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return 0;
      }
    });
  }

  async clear(): Promise<boolean> {
    return await this.executeWithMetrics('cache.clear', async () => {
      try {
        await this.redis.flushdb();
        
        this.logger.info('Cache cleared');
        this.metrics.incrementCounter('cache.cleared');

        return true;

      } catch (error) {
        this.logger.error('Cache clear failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return false;
      }
    });
  }

  async getMetrics(): Promise<CacheMetrics> {
    try {
      const info = await this.redis.info('memory');
      const memoryInfo = this.parseMemoryInfo(info);

      return {
        ...this.cacheMetrics,
        memory: memoryInfo
      };

    } catch (error) {
      this.logger.error('Failed to get cache metrics', { error });
      return this.cacheMetrics;
    }
  }

  private parseMemoryInfo(info: string): CacheMetrics['memory'] {
    const lines = info.split('\r\n');
    const memory: CacheMetrics['memory'] = {
      used: 0,
      peak: 0,
      fragmentation: 0
    };

    lines.forEach(line => {
      if (line.startsWith('used_memory:')) {
        memory.used = parseInt(line.split(':')[1] || '0');
      } else if (line.startsWith('used_memory_peak:')) {
        memory.peak = parseInt(line.split(':')[1] || '0');
      } else if (line.startsWith('mem_fragmentation_ratio:')) {
        memory.fragmentation = parseFloat(line.split(':')[1] || '0');
      }
    });

    return memory;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Cache health check failed', { error });
      return false;
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  isHealthy(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }
}
