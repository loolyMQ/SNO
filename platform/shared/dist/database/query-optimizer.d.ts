import pino from 'pino';
export interface QueryOptimizationConfig {
    enableCaching: boolean;
    cacheTTL: number;
    enableMetrics: boolean;
    enableAnalysis: boolean;
    maxQueryTime: number;
    slowQueryThreshold: number;
}
export declare class QueryOptimizer {
    private config;
    private static readonly DEFAULT_CONFIG;
    private analyzer;
    private cache;
    private metrics;
    private executor;
    private logger;
    constructor(config?: Partial<QueryOptimizationConfig>, logger?: pino.Logger);
    static create(config?: Partial<QueryOptimizationConfig>, logger?: pino.Logger): QueryOptimizer;
    optimizeQuery<T>(query: string, params?: unknown[], cacheKey?: string): Promise<T>;
    optimizeBatchQueries<T>(queries: Array<{
        query: string;
        params: unknown[];
        cacheKey?: string;
    }>): Promise<T[]>;
    getQueryStats(): Promise<{
        totalQueries: number;
        averageTime: number;
        slowQueries: number;
        cacheHitRate: number;
        errorRate: number;
    }>;
    clearCache(): Promise<void>;
    getSlowQueries(limit?: number): Promise<Array<{
        query: string;
        averageTime: number;
        executionCount: number;
    }>>;
    getQuerySuggestions(query: string): Promise<string[]>;
    private generateQueryId;
    private sanitizeQuery;
    private sanitizeParams;
}
//# sourceMappingURL=query-optimizer.d.ts.map