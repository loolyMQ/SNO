import Redis from 'ioredis';

// Redis connection configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (_error) => { 
  // Redis Client Error - handled silently in production
});
redis.on('connect', () => { 
  // Redis Client Connected
});
redis.on('ready', () => { 
  // Redis Client Ready
});

// Cache configuration
const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

export class JobsCacheService {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (_error) {
      // Cache set error handled silently
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (_error) {
      // Cache delete error handled silently
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (_error) {
      return false;
    }
  }

  // Jobs-specific cache methods
  async cacheJobStatus(jobId: string, status: Record<string, unknown>, ttl: number = CACHE_TTL.SHORT): Promise<void> {
    const key = `job:${jobId}:status`;
    await this.set(key, status, ttl);
  }

  async getCachedJobStatus(jobId: string): Promise<Record<string, unknown> | null> {
    const key = `job:${jobId}:status`;
    return await this.get(key);
  }

  async cacheJobResults(jobId: string, results: Record<string, unknown>, ttl: number = CACHE_TTL.LONG): Promise<void> {
    const key = `job:${jobId}:results`;
    await this.set(key, results, ttl);
  }

  async getCachedJobResults(jobId: string): Promise<Record<string, unknown> | null> {
    const key = `job:${jobId}:results`;
    return await this.get(key);
  }

  async cacheJobQueue(queueName: string, jobs: Record<string, unknown>[], ttl: number = CACHE_TTL.SHORT): Promise<void> {
    const key = `queue:${queueName}`;
    await this.set(key, jobs, ttl);
  }

  async getCachedJobQueue(queueName: string): Promise<unknown[] | null> {
    const key = `queue:${queueName}`;
    return await this.get(key);
  }

  // Cache invalidation patterns
  async invalidateJob(jobId: string): Promise<void> {
    const pattern = `job:${jobId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateQueue(queueName: string): Promise<void> {
    const key = `queue:${queueName}`;
    await this.del(key);
  }

  // Job progress tracking
  async setJobProgress(jobId: string, progress: number): Promise<void> {
    const key = `job:${jobId}:progress`;
    await this.set(key, { progress, timestamp: Date.now() }, CACHE_TTL.SHORT);
  }

  async getJobProgress(jobId: string): Promise<{ progress: number; timestamp: number } | null> {
    const key = `job:${jobId}:progress`;
    return await this.get(key);
  }
}

// Global jobs cache service instance
export const jobsCacheService = new JobsCacheService(redis);

// Health check for Redis
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (_error) {
    return false;
  }
};

// Redis metrics
export const getRedisMetrics = async () => {
  try {
    const info = await redis.info('memory');
    const keyspace = await redis.info('keyspace');
    
    return {
      connected: redis.status === 'ready',
      memory: info,
      keyspace: keyspace,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default redis;
