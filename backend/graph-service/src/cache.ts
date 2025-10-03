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

export class CacheService {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
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

  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (_error) {
      // Cache flush error handled silently
    }
  }

  // Graph-specific cache methods
  async cacheGraphData(graphId: string, data: unknown, ttl: number = CACHE_TTL.LONG): Promise<void> {
    const key = `graph:${graphId}`;
    await this.set(key, data, ttl);
  }

  async getCachedGraphData(graphId: string): Promise<unknown | null> {
    const key = `graph:${graphId}`;
    return await this.get(key);
  }

  async cacheSearchResults(query: string, results: unknown[], ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    await this.set(key, results, ttl);
  }

  async getCachedSearchResults(query: string): Promise<unknown[] | null> {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return await this.get(key);
  }

  // Cache invalidation patterns
  async invalidateGraph(graphId: string): Promise<void> {
    const pattern = `graph:${graphId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateSearchCache(): Promise<void> {
    const pattern = 'search:*';
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}


export default redis;
