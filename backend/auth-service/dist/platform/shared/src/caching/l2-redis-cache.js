import { CacheLevel } from './types';
import Redis from 'ioredis';
import pino from 'pino';
export class L2RedisCache {
    redis;
    config;
    logger;
    metrics;
    operations = [];
    constructor(config, redisUrl) {
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
        this.redis = new Redis(redisUrl || process.env['REDIS_URL'] || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
            connectTimeout: 10000,
            commandTimeout: 5000,
        });
        this.metrics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            evictions: 0,
            size: 0,
            maxSize: config.maxSize,
            memoryUsage: 0,
            averageAccessTime: 0,
        };
        this.setupEventHandlers();
    }
    async get(key) {
        const startTime = Date.now();
        const fullKey = this.getFullKey(key);
        try {
            const value = await this.redis.get(fullKey);
            if (!value) {
                this.recordOperation('get', key, false, Date.now() - startTime);
                this.metrics.misses++;
                this.updateHitRate();
                return null;
            }
            this.metrics.hits++;
            this.updateHitRate();
            this.updateAverageAccessTime(Date.now() - startTime);
            this.recordOperation('get', key, true, Date.now() - startTime);
            return this.deserializeValue(value);
        }
        catch (error) {
            this.logger.error({ key, error }, 'L2 Redis cache get error');
            this.recordOperation('get', key, false, Date.now() - startTime);
            return null;
        }
    }
    async set(key, value, ttl) {
        const startTime = Date.now();
        const fullKey = this.getFullKey(key);
        try {
            const serializedValue = this.serializeValue(value);
            const actualTtl = ttl || this.config.ttl;
            await this.redis.setex(fullKey, Math.floor(actualTtl / 1000), serializedValue);
            this.recordOperation('set', key, true, Date.now() - startTime);
            return true;
        }
        catch (error) {
            this.logger.error({ key, error }, 'L2 Redis cache set error');
            this.recordOperation('set', key, false, Date.now() - startTime);
            return false;
        }
    }
    async delete(key) {
        const startTime = Date.now();
        const fullKey = this.getFullKey(key);
        try {
            const result = await this.redis.del(fullKey);
            const existed = result > 0;
            this.recordOperation('delete', key, existed, Date.now() - startTime);
            return existed;
        }
        catch (error) {
            this.logger.error({ key, error }, 'L2 Redis cache delete error');
            this.recordOperation('delete', key, false, Date.now() - startTime);
            return false;
        }
    }
    async clear() {
        const startTime = Date.now();
        try {
            const pattern = `${this.config.namespace}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            this.recordOperation('clear', 'all', true, Date.now() - startTime);
        }
        catch (error) {
            this.logger.error({ error }, 'L2 Redis cache clear error');
            this.recordOperation('clear', 'all', false, Date.now() - startTime);
        }
    }
    async mget(keys) {
        const startTime = Date.now();
        const fullKeys = keys.map(key => this.getFullKey(key));
        try {
            const values = await this.redis.mget(...fullKeys);
            const results = values.map(value => (value ? this.deserializeValue(value) : null));
            this.recordOperation('mget', keys.join(','), true, Date.now() - startTime);
            return results;
        }
        catch (error) {
            this.logger.error({ keys, error }, 'L2 Redis cache mget error');
            this.recordOperation('mget', keys.join(','), false, Date.now() - startTime);
            return keys.map(() => null);
        }
    }
    async mset(entries) {
        const startTime = Date.now();
        try {
            const pipeline = this.redis.pipeline();
            for (const { key, value, ttl } of entries) {
                const fullKey = this.getFullKey(key);
                const serializedValue = this.serializeValue(value);
                const actualTtl = ttl || this.config.ttl;
                pipeline.setex(fullKey, Math.floor(actualTtl / 1000), serializedValue);
            }
            await pipeline.exec();
            this.recordOperation('mset', entries.map(e => e.key).join(','), true, Date.now() - startTime);
            return true;
        }
        catch (error) {
            this.logger.error({ entries, error }, 'L2 Redis cache mset error');
            this.recordOperation('mset', entries.map(e => e.key).join(','), false, Date.now() - startTime);
            return false;
        }
    }
    async exists(key) {
        const fullKey = this.getFullKey(key);
        try {
            const result = await this.redis.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            this.logger.error({ key, error }, 'L2 Redis cache exists error');
            return false;
        }
    }
    async expire(key, ttl) {
        const fullKey = this.getFullKey(key);
        try {
            const result = await this.redis.expire(fullKey, Math.floor(ttl / 1000));
            return result === 1;
        }
        catch (error) {
            this.logger.error({ key, ttl, error }, 'L2 Redis cache expire error');
            return false;
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getOperations(limit = 100) {
        return this.operations.slice(-limit);
    }
    async getInfo() {
        try {
            const info = await this.redis.info();
            // Parse Redis info string into key-value pairs
            const result = {};
            info.split('\r\n').forEach(line => {
                if (line.includes(':')) {
                    const [key, value] = line.split(':', 2);
                    if (key && value) {
                        result[key] = value;
                    }
                }
            });
            return result;
        }
        catch (error) {
            this.logger.error({ error }, 'L2 Redis cache info error');
            return {};
        }
    }
    async shutdown() {
        try {
            await this.redis.quit();
            this.logger.info('L2 Redis cache connection closed');
        }
        catch (error) {
            this.logger.error({ error }, 'L2 Redis cache shutdown error');
        }
    }
    getFullKey(key) {
        return `${this.config.namespace}:${key}`;
    }
    serializeValue(value) {
        return JSON.stringify(value);
    }
    deserializeValue(value) {
        return JSON.parse(value);
    }
    setupEventHandlers() {
        this.redis.on('connect', () => {
            this.logger.info('L2 Redis cache connected');
        });
        this.redis.on('error', error => {
            this.logger.error({ error }, 'L2 Redis cache error');
        });
        this.redis.on('close', () => {
            this.logger.warn('L2 Redis cache connection closed');
        });
        this.redis.on('reconnecting', () => {
            this.logger.info('L2 Redis cache reconnecting');
        });
    }
    updateHitRate() {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }
    updateAverageAccessTime(duration) {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.averageAccessTime =
            (this.metrics.averageAccessTime * (total - 1) + duration) / total;
    }
    recordOperation(operation, key, success, duration) {
        this.operations.push({
            operation: operation,
            key,
            success,
            duration,
            timestamp: Date.now(),
            level: CacheLevel.L2_REDIS,
        });
        if (this.operations.length > 1000) {
            this.operations = this.operations.slice(-500);
        }
    }
}
//# sourceMappingURL=l2-redis-cache.js.map