import { Pool } from 'pg';
import pino from 'pino';
import { IQueryAnalysis } from './query-analyzer';
export interface IQueryExecutorConfig {
    enableOptimization: boolean;
    enableCaching: boolean;
    enableMetrics: boolean;
    slowQueryThreshold: number;
    verySlowQueryThreshold: number;
}
export interface IQueryOptimization {
    originalQuery: string;
    optimizedQuery: string;
    improvementFactor: number;
    optimizations: string[];
}
export declare class QueryExecutor {
    private pool;
    private config;
    private logger;
    private cache;
    private metrics;
    constructor(pool: Pool, config: IQueryExecutorConfig, logger: pino.Logger);
    executeOptimized<T>(query: string, params?: unknown[], options?: {
        enableOptimization?: boolean;
        forceAnalyze?: boolean;
        cacheResults?: boolean;
    }): Promise<{
        result: T;
        analysis: IQueryAnalysis;
    }>;
    private executeQuery;
    private analyzeQuery;
    private optimizeQuery;
    private shouldUseExplainAnalyze;
    private extractIndexScans;
    private extractSeqScans;
    private extractJoins;
    private extractSorts;
    private traversePlan;
    private generateRecommendations;
    private calculateOptimizationLevel;
    getCacheStats(): Record<string, unknown>;
    getMetrics(): Record<string, unknown>;
    clearCache(): void;
}
//# sourceMappingURL=query-executor.d.ts.map