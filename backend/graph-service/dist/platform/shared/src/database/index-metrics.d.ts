import pino from 'pino';
export declare class IndexMetrics {
    private indexUsageCounter;
    private indexHitRateGauge;
    private indexExecutionTimeHistogram;
    private indexSizeGauge;
    private slowQueryCounter;
    private logger;
    private indexUsageName;
    private indexHitRateName;
    private indexExecTimeName;
    private indexSizeName;
    private slowQueryName;
    constructor(serviceName: string, logger: pino.Logger);
    recordIndexUsage(indexName: string, operation: string, status: 'success' | 'error'): void;
    recordIndexExecutionTime(indexName: string, operation: string, executionTimeMs: number): void;
    recordIndexHitRate(indexName: string, hitRate: number): void;
    recordIndexSize(indexName: string, size: number): void;
    recordSlowQuery(indexName: string, threshold: string): void;
    getMetrics(): Promise<string>;
    getIndexUsageStats(): Promise<{
        totalUsages: number;
        successRate: number;
        averageExecutionTime: number;
        slowQueries: number;
    }>;
    getIndexPerformanceReport(): Promise<string>;
    resetMetrics(): void;
    getPrometheusMetrics(): Promise<string>;
}
//# sourceMappingURL=index-metrics.d.ts.map