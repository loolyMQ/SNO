import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({
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

export interface ICacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayOnFailover?: number; // Optional, not a valid ioredis option
}

export interface ICacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export class RedisClient {
  private client: Redis;
  private config: ICacheConfig;
  private isConnected = false;
  private serviceName: string;

  constructor(serviceName: string, config?: Partial<ICacheConfig>) {
    this.serviceName = serviceName;

    this.config = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      password: process.env['REDIS_PASSWORD'] || '',
      db: 0,
      keyPrefix: `${serviceName}:`,
      defaultTTL: 3600,
      maxRetries: 3,
      // retryDelayOnFailover: 100, // Not a valid ioredis option
      ...config,
    };

    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password || undefined,
      db: this.config.db,
      // keyPrefix: this.config.keyPrefix, // Not a valid Redis constructor option
      maxRetriesPerRequest: this.config.maxRetries,
      lazyConnect: true,
      connectionName: `${serviceName}-client`,
      enableReadyCheck: true,
    } as any);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info(`🔗 Redis connecting for ${this.serviceName}...`);
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info(`✅ Redis connected for ${this.serviceName}`);
    });

    this.client.on('error', error => {
      this.isConnected = false;
      logger.error(`❌ Redis error for ${this.serviceName}:`, error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn(`🔌 Redis connection closed for ${this.serviceName}`);
    });

    this.client.on('reconnecting', (delay: number) => {
      logger.warn(`🔄 Redis reconnecting for ${this.serviceName} in ${delay}ms`);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info(`📦 Redis client initialized for ${this.serviceName}`);
    } catch (error) {
      logger.error(`❌ Failed to connect Redis for ${this.serviceName}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info(`📦 Redis client disconnected for ${this.serviceName}`);
    } catch (error) {
      logger.error(`❌ Failed to disconnect Redis for ${this.serviceName}:`, error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.config.defaultTTL): Promise<void> {
    try {
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        ttl,
        key,
      } as ICacheEntry<T>);

      await this.client.setex(key, ttl, serialized);

      logger.debug(`📝 Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`❌ Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(key);

      if (!cached) {
        logger.debug(`🚫 Cache MISS: ${key}`);
        return null;
      }

      const entry: ICacheEntry<T> = JSON.parse(cached);
      logger.debug(`✅ Cache HIT: ${key} (age: ${Date.now() - entry.timestamp}ms)`);

      return entry.value;
    } catch (error) {
      logger.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      logger.debug(`🗑️ Cache DELETE: ${key} (existed: ${result > 0})`);
      return result > 0;
    } catch (error) {
      logger.error(`❌ Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async setex<T>(key: string, seconds: number, value: T): Promise<void> {
    return this.set(key, value, seconds);
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const result = await this.client.incrby(key, by);
      logger.debug(`📊 Cache INCREMENT: ${key} by ${by} = ${result}`);
      return result;
    } catch (error) {
      logger.error(`❌ Redis INCREMENT error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`❌ Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  async flushNamespace(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}*`);

      if (keys.length > 0) {
        await this.client.del(...keys);
        logger.warn(`🧹 Flushed ${keys.length} keys from namespace ${this.config.keyPrefix}`);
      }
    } catch (error) {
      logger.error(`❌ Redis FLUSH namespace error:`, error);
      throw error;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);

      return values.map((value, index) => {
        if (!value) {
          logger.debug(`🚫 Cache MISS: ${keys[index]}`);
          return null;
        }

        try {
          const entry: ICacheEntry<T> = JSON.parse(value);
          logger.debug(`✅ Cache HIT: ${keys[index]}`);
          return entry.value;
        } catch (parseError) {
          logger.error(`❌ Parse error for key ${keys[index]}:`, parseError);
          return null;
        }
      });
    } catch (error) {
      logger.error(`❌ Redis MGET error:`, error);
      return keys.map(() => null);
    }
  }

  async cached<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = this.config.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    logger.debug(`🔄 Cache FETCH: ${key}`);
    const value = await fetchFunction();

    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }

    return value;
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      latency?: number;
      memory?: Record<string, unknown>;
      error?: string;
    };
  }> {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      let memory: Record<string, unknown> = {};
      try {
        const info = await this.client.memory('USAGE', 'test-key');
        memory = { usage: info };
      } catch (e) {}

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          latency,
          memory,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  getConfig(): ICacheConfig {
    return { ...this.config };
  }

  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  getServiceName(): string {
    return this.serviceName;
  }

  getClient(): Redis {
    return this.client;
  }
}

export const createRedisClient = (
  serviceName: string,
  config?: Partial<ICacheConfig>
): RedisClient => {
  return new RedisClient(serviceName, config);
};
