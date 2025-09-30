import { IQueryAnalysis } from './query-analyzer';
export interface IQueryCacheConfig {
    maxSize: number;
    ttl: number;
    enableCompression: boolean;
}
export declare class QueryCache {
    private cache;
    private config;
    constructor(config: IQueryCacheConfig);
    get(key: string): IQueryAnalysis | null;
    set(key: string, analysis: IQueryAnalysis): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        oldestEntry: number;
        newestEntry: number;
    };
    private isExpired;
    private evictOldest;
    generateKey(query: string, params?: unknown[]): string;
}
//# sourceMappingURL=query-cache.d.ts.map