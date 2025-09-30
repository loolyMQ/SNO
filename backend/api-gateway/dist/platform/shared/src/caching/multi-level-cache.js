import { CacheLevel, CacheStrategy } from './types';
import { L1MemoryCache } from './l1-memory-cache';
import { L2RedisCache } from './l2-redis-cache';
import pino from 'pino';
export class MultiLevelCache {
    l1Cache;
    l2Cache;
    config;
    logger;
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
        this.l1Cache = new L1MemoryCache({
            ...config,
            level: CacheLevel.L1_MEMORY,
        });
        this.l2Cache = new L2RedisCache({
            ...config,
            level: CacheLevel.L2_REDIS,
        }, redisUrl);
    }
    async get(key) {
        try {
            const l1Value = await this.l1Cache.get(key);
            if (l1Value !== null) {
                this.logger.debug({ key, level: 'L1' }, 'Cache hit in L1');
                return l1Value;
            }
            const l2Value = await this.l2Cache.get(key);
            if (l2Value !== null) {
                this.logger.debug({ key, level: 'L2' }, 'Cache hit in L2');
                await this.l1Cache.set(key, l2Value);
                return l2Value;
            }
            this.logger.debug({ key }, 'Cache miss in all levels');
            return null;
        }
        catch (error) {
            this.logger.error({ key, error }, 'Multi-level cache get error');
            return null;
        }
    }
    async set(key, value, ttl) {
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
        }
        catch (error) {
            this.logger.error({ key, error }, 'Multi-level cache set error');
            return false;
        }
    }
    async delete(key) {
        try {
            const l1Result = await this.l1Cache.delete(key);
            const l2Result = await this.l2Cache.delete(key);
            this.logger.debug({ key, l1Result, l2Result }, 'Cache delete operation');
            return l1Result || l2Result;
        }
        catch (error) {
            this.logger.error({ key, error }, 'Multi-level cache delete error');
            return false;
        }
    }
    async clear() {
        try {
            await Promise.all([this.l1Cache.clear(), this.l2Cache.clear()]);
            this.logger.info('Multi-level cache cleared');
        }
        catch (error) {
            this.logger.error({ error }, 'Multi-level cache clear error');
        }
    }
    async mget(keys) {
        try {
            const results = new Array(keys.length);
            const missingKeys = [];
            for (let i = 0; i < keys.length; i++) {
                const l1Value = await this.l1Cache.get(keys[i]);
                if (l1Value !== null) {
                    results[i] = l1Value;
                }
                else {
                    missingKeys.push(i);
                }
            }
            if (missingKeys.length > 0) {
                const missingKeysList = missingKeys
                    .map(i => keys[i])
                    .filter((key) => typeof key === 'string');
                const l2Values = await this.l2Cache.mget(missingKeysList);
                for (let i = 0; i < missingKeys.length; i++) {
                    const keyIndex = missingKeys[i];
                    const value = l2Values[i];
                    if (value !== null && keyIndex !== undefined) {
                        results[keyIndex] = value;
                        const key = keys[keyIndex];
                        if (key) {
                            await this.l1Cache.set(key, value);
                        }
                    }
                }
            }
            return results;
        }
        catch (error) {
            this.logger.error({ keys, error }, 'Multi-level cache mget error');
            return keys.map(() => null);
        }
    }
    async mset(entries) {
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
        }
        catch (error) {
            this.logger.error({ entries, error }, 'Multi-level cache mset error');
            return false;
        }
    }
    async invalidate(pattern) {
        try {
            let invalidated = 0;
            const l1Keys = Array.from(this.l1Cache.cache.keys()).filter((key) => typeof key === 'string' && this.matchesPattern(key, pattern));
            for (const key of l1Keys) {
                if (typeof key === 'string') {
                    await this.l1Cache.delete(key);
                    invalidated++;
                }
            }
            const l2Pattern = `${this.config.namespace}:${pattern}`;
            const l2Keys = await this.l2Cache.redis.keys(l2Pattern);
            if (l2Keys.length > 0) {
                await this.l2Cache.redis.del(...l2Keys);
                invalidated += l2Keys.length;
            }
            this.logger.info({ pattern, invalidated }, 'Cache invalidation completed');
            return invalidated;
        }
        catch (error) {
            this.logger.error({ pattern, error }, 'Cache invalidation error');
            return 0;
        }
    }
    getMetrics() {
        const l1Metrics = this.l1Cache.getMetrics();
        const l2Metrics = this.l2Cache.getMetrics();
        const combined = {
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
    getOperations(limit = 100) {
        const l1Ops = this.l1Cache.getOperations(limit);
        const l2Ops = this.l2Cache.getOperations(limit);
        return [...l1Ops, ...l2Ops].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    async shutdown() {
        try {
            await this.l2Cache.shutdown();
            this.logger.info('Multi-level cache shutdown complete');
        }
        catch (error) {
            this.logger.error({ error }, 'Multi-level cache shutdown error');
        }
    }
    async writeThrough(key, value, ttl) {
        const l1Result = await this.l1Cache.set(key, value, ttl);
        const l2Result = await this.l2Cache.set(key, value, ttl);
        return l1Result && l2Result;
    }
    async writeBehind(key, value, ttl) {
        const l1Result = await this.l1Cache.set(key, value, ttl);
        setImmediate(async () => {
            await this.l2Cache.set(key, value, ttl);
        });
        return l1Result;
    }
    async writeAround(key, value, ttl) {
        return await this.l2Cache.set(key, value, ttl);
    }
    async cacheAside(key, value, ttl) {
        const l2Result = await this.l2Cache.set(key, value, ttl);
        return l2Result;
    }
    async msetWriteThrough(entries) {
        const l2Result = await this.l2Cache.mset(entries);
        for (const { key, value, ttl } of entries) {
            await this.l1Cache.set(key, value, ttl);
        }
        return l2Result;
    }
    async msetWriteBehind(entries) {
        for (const { key, value, ttl } of entries) {
            await this.l1Cache.set(key, value, ttl);
        }
        setImmediate(async () => {
            await this.l2Cache.mset(entries);
        });
        return true;
    }
    async msetWriteAround(entries) {
        return await this.l2Cache.mset(entries);
    }
    async msetCacheAside(entries) {
        return await this.l2Cache.mset(entries);
    }
    matchesPattern(key, pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(key);
    }
}
//# sourceMappingURL=multi-level-cache.js.map