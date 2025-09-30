import { CacheConfig, CacheMetrics, CacheOperation } from './types';
export declare class L2RedisCache {
    private redis;
    private config;
    private logger;
    private metrics;
    private operations;
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
    exists(key: string): Promise<boolean>;
    expire(key: string, ttl: number): Promise<boolean>;
    getMetrics(): CacheMetrics;
    getOperations(limit?: number): CacheOperation[];
    getInfo(): Promise<Record<string, string>>;
    shutdown(): Promise<void>;
    private getFullKey;
    private serializeValue;
    private deserializeValue;
    private setupEventHandlers;
    private updateHitRate;
    private updateAverageAccessTime;
    private recordOperation;
}
//# sourceMappingURL=l2-redis-cache.d.ts.map