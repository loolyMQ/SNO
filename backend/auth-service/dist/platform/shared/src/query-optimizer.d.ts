import { Pool } from 'pg';
import pino from 'pino';
export interface ISlowQueryConfig {
    slowQueryThreshold: number;
    verySlowQueryThreshold: number;
    enableExplainAnalyze: boolean;
    enableQueryRewriting: boolean;
    enableIndexSuggestions: boolean;
    logSlowQueries: boolean;
}
export declare class QueryOptimizer {
    private _pool;
    private _config;
    private _logger;
    private executor;
    constructor(_pool: Pool, _config: ISlowQueryConfig, _logger: pino.Logger);
    executeOptimized<T>(query: string, params?: unknown[], options?: {
        enableOptimization?: boolean;
        forceAnalyze?: boolean;
        cacheResults?: boolean;
    }): Promise<{
        result: T;
        analysis: any;
    }>;
    getCacheStats(): Record<string, unknown>;
    getMetrics(): Record<string, unknown>;
    clearCache(): void;
}
export declare const createQueryOptimizer: (pool: Pool, config: ISlowQueryConfig, logger: pino.Logger) => QueryOptimizer;
//# sourceMappingURL=query-optimizer.d.ts.map