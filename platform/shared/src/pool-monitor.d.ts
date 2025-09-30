import pino from 'pino';
export interface IPoolMetrics {
    utilizationPercentage: number;
    healthScore: number;
    averageAcquisitionTime: number;
    totalOperations: number;
    errorRate: number;
    connectionLifetime: {
        p50: number;
        p95: number;
        p99: number;
    };
}
export interface IPoolAlert {
    poolName: string;
    level: 'warning' | 'critical';
    message: string;
    timestamp: number;
    metrics: Partial<IPoolMetrics>;
}
export interface IPoolMonitorConfig {
    enableMetrics: boolean;
    enableAlerting: boolean;
    metricsIntervalMs: number;
    alertThresholds: {
        utilizationWarning: number;
        utilizationCritical: number;
        errorRateWarning: number;
        errorRateCritical: number;
        acquisitionTimeWarning: number;
        acquisitionTimeCritical: number;
    };
}
export declare class PoolMonitor {
    private poolManager;
    private config;
    private logger;
    private metrics;
    private alerts;
    private monitoringInterval?;
    constructor(poolManager: any, config: IPoolMonitorConfig, logger: pino.Logger);
    start(): void;
    stop(): void;
    private collectMetrics;
    private calculateMetrics;
    private updatePrometheusMetrics;
    private checkAlerts;
    getMetrics(poolName?: string): Map<string, IPoolMetrics> | IPoolMetrics | undefined;
    getAlerts(poolName?: string, level?: 'warning' | 'critical'): IPoolAlert[];
    generateReport(): Promise<string>;
}
export declare class PoolPerformanceAnalyzer {
    private _monitor;
    private _logger;
    private performanceHistory;
    constructor(_monitor: PoolMonitor, _logger: pino.Logger);
    recordPerformance(poolName: string, metrics: IPoolMetrics): void;
    analyzePerformanceTrends(poolName: string): {
        trend: 'improving' | 'degrading' | 'stable';
        utilizationTrend: number;
        errorRateTrend: number;
        acquisitionTimeTrend: number;
    };
    generateOptimizationRecommendations(poolName: string): string[];
}
export declare const createPoolMonitor: (poolManager: any, config?: Partial<IPoolMonitorConfig>, logger?: pino.Logger) => PoolMonitor;
//# sourceMappingURL=pool-monitor.d.ts.map