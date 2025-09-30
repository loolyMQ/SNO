import { HealthCheckResult, ServiceHealthCheck, HealthCheckConfig } from './types';
export declare class HealthChecker {
    private config;
    private checks;
    private startTime;
    constructor(config?: Partial<HealthCheckConfig>);
    addCheck(name: string, checkFn: () => Promise<ServiceHealthCheck>): void;
    performHealthCheck(): Promise<HealthCheckResult>;
    private determineOverallStatus;
    startPeriodicChecks(): Promise<void>;
}
//# sourceMappingURL=checker.d.ts.map