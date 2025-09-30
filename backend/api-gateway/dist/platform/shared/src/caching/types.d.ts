export declare enum CacheLevel {
    L1_MEMORY = "l1_memory",
    L2_REDIS = "l2_redis",
    L3_CDN = "l3_cdn"
}
export declare enum CacheStrategy {
    WRITE_THROUGH = "write_through",
    WRITE_BEHIND = "write_behind",
    WRITE_AROUND = "write_around",
    CACHE_ASIDE = "cache_aside"
}
export declare enum CacheEvictionPolicy {
    LRU = "lru",
    LFU = "lfu",
    FIFO = "fifo",
    TTL = "ttl",
    RANDOM = "random"
}
export interface CacheConfig {
    level: CacheLevel;
    ttl: number;
    maxSize: number;
    evictionPolicy: CacheEvictionPolicy;
    strategy: CacheStrategy;
    compression: boolean;
    encryption: boolean;
    namespace: string;
}
export interface CacheEntry<T = unknown> {
    key: string;
    value: T;
    ttl: number;
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
    size: number;
    compressed: boolean;
    encrypted: boolean;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
    maxSize: number;
    memoryUsage: number;
    averageAccessTime: number;
}
export interface CacheOperation {
    operation: 'get' | 'set' | 'delete' | 'clear';
    key: string;
    success: boolean;
    duration: number;
    timestamp: number;
    level: CacheLevel;
}
export interface CacheInvalidationRule {
    pattern: string;
    ttl?: number;
    conditions?: Record<string, unknown>;
    cascade?: boolean;
}
export interface CacheWarmingConfig {
    key: string;
    dataSource: () => Promise<unknown>;
    schedule?: string;
    priority: number;
    dependencies?: string[];
}
//# sourceMappingURL=types.d.ts.map