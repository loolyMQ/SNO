export interface ResourceMetrics {
    memory: {
        used: number;
        total: number;
        free: number;
        percentage: number;
    };
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    process: {
        pid: number;
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
    };
    system: {
        platform: string;
        arch: string;
        nodeVersion: string;
        uptime: number;
    };
}
export declare class ResourceMonitor {
    private memoryGauge;
    private cpuGauge;
    private processMemoryGauge;
    private processCpuGauge;
    private requestCounter;
    private responseTimeHistogram;
    private errorCounter;
    private activeConnectionsGauge;
    private gcDurationSummary;
    private lastCpuUsage;
    private lastCpuTime;
    constructor(serviceName: string);
    private startMonitoring;
    private updateSystemMetrics;
    private updateProcessMetrics;
    recordRequest(method: string, route: string, statusCode: number, duration: number): void;
    recordError(type: string, severity: 'low' | 'medium' | 'high' | 'critical'): void;
    setActiveConnections(count: number): void;
    getCurrentMetrics(): ResourceMetrics;
    getMetrics(): Promise<string>;
    clearMetrics(): void;
}
//# sourceMappingURL=resource-monitor.d.ts.map