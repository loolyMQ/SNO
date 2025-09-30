import { IQueryAnalysis } from './query-analyzer';
export interface IQueryMetricsConfig {
    slowQueryThreshold: number;
    verySlowQueryThreshold: number;
    enableMetrics: boolean;
}
export declare class QueryMetrics {
    private config;
    private slowQueries;
    constructor(config: IQueryMetricsConfig);
    recordQuery(queryType: string, table: string, executionTime: number, analysis: IQueryAnalysis): void;
    recordError(queryType: string, table: string, _error: Error): void;
    updateCacheHitRatio(hitRatio: number): void;
    getSlowQueries(): Array<{
        query: string;
        time: number;
        timestamp: number;
    }>;
    getMetrics(): {
        totalQueries: number;
        slowQueries: number;
        averageExecutionTime: number;
        cacheHitRatio: number;
    };
    private handleSlowQuery;
    extractQueryType(query: string): string;
    extractTableName(query: string): string;
}
//# sourceMappingURL=query-metrics.d.ts.map