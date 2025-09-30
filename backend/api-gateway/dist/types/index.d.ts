export interface ServiceConfig {
    auth: string;
    graph: string;
    search: string;
    jobs: string;
}
export interface HealthCheck {
    success: boolean;
    status?: string;
    error?: string;
    timestamp?: number;
}
export interface ServiceHealthChecks {
    [key: string]: HealthCheck;
}
//# sourceMappingURL=index.d.ts.map