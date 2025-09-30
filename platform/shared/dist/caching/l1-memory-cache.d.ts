import { CacheConfig, CacheMetrics, CacheOperation } from './types';
export declare class L1MemoryCache {
    private cache;
    private config;
    private logger;
    private metrics;
    private operations;
    constructor(config: CacheConfig);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    getMetrics(): CacheMetrics;
    getOperations(limit?: number): CacheOperation[];
    private isExpired;
    private evictIfNeeded;
    private evict;
    private startCleanupInterval;
    private cleanup;
    private serializeValue;
    private deserializeValue;
    private calculateSize;
    private compress;
    private encrypt;
    private updateSize;
    private updateMemoryUsage;
    private updateHitRate;
    private updateAverageAccessTime;
    private resetMetrics;
    private recordOperation;
}
//# sourceMappingURL=l1-memory-cache.d.ts.map