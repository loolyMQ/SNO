export declare class MetricsService {
    private static instance;
    private meter;
    private counters;
    private histograms;
    private gauges;
    static getInstance(): MetricsService;
    initialize(serviceName: string, serviceVersion: string): void;
    createCounter(name: string, _description: string, _unit?: string): {
        add: (value: number) => void;
    } | undefined;
    createHistogram(name: string, _description: string, _unit?: string): {
        record: (value: number) => void;
    } | undefined;
    createGauge(name: string, _description: string, _unit?: string): {
        record: (value: number) => void;
    } | undefined;
    recordCounter(name: string, value: number, _attributes?: Record<string, string | number | boolean>): void;
    recordHistogram(name: string, value: number, _attributes?: Record<string, string | number | boolean>): void;
    recordGauge(name: string, value: number, _attributes?: Record<string, string | number | boolean>): void;
}
//# sourceMappingURL=metrics.d.ts.map