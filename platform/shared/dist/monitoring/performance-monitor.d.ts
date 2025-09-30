import { ResourceMetrics } from './resource-monitor';
export interface PerformanceMetrics {
    throughput: {
        requestsPerSecond: number;
        errorsPerSecond: number;
        averageResponseTime: number;
    };
    latency: {
        p50: number;
        p95: number;
        p99: number;
        max: number;
    };
    errors: {
        rate: number;
        types: Record<string, number>;
    };
    resources: ResourceMetrics;
}
export declare class PerformanceMonitor {
    private resourceMonitor;
    private throughputGauge;
    private latencyHistogram;
    private errorRateGauge;
    private queueSizeGauge;
    private cacheHitRateGauge;
    private databaseQueryCounter;
    private databaseQueryHistogram;
    private requestTimes;
    private errorCounts;
    private lastUpdateTime;
    private requestCount;
    private errorCount;
    constructor(serviceName: string);
    private startPerformanceTracking;
    private updatePerformanceMetrics;
    recordRequest(duration: number, operation?: string): void;
    recordError(type: string, severity?: 'low' | 'medium' | 'high' | 'critical'): void;
    recordDatabaseQuery(operation: string, table: string, duration: number, status: 'success' | 'error'): void;
    setQueueSize(queueName: string, size: number): void;
    setCacheHitRate(cacheName: string, hitRate: number): void;
    setActiveConnections(count: number): void;
    getPerformanceMetrics(): PerformanceMetrics;
    private calculatePercentile;
    getMetrics(): Promise<string>;
    clearMetrics(): void;
}
//# sourceMappingURL=performance-monitor.d.ts.map