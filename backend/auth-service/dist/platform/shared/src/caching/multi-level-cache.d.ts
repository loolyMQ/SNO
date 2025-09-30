import { CacheConfig, CacheMetrics, CacheOperation } from './types';
export declare class MultiLevelCache {
    private l1Cache;
    private l2Cache;
    private config;
    private logger;
    constructor(config: CacheConfig, redisUrl?: string);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    mget<T>(keys: string[]): Promise<(T | null)[]>;
    mset<T>(entries: Array<{
        key: string;
        value: T;
        ttl?: number;
    }>): Promise<boolean>;
    invalidate(pattern: string): Promise<number>;
    getMetrics(): {
        l1: CacheMetrics;
        l2: CacheMetrics;
        combined: CacheMetrics;
    };
    getOperations(limit?: number): CacheOperation[];
    shutdown(): Promise<void>;
    private writeThrough;
    private writeBehind;
    private writeAround;
    private cacheAside;
    private msetWriteThrough;
    private msetWriteBehind;
    private msetWriteAround;
    private msetCacheAside;
    private matchesPattern;
}
//# sourceMappingURL=multi-level-cache.d.ts.map