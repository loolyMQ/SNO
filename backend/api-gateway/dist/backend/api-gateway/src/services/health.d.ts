import { ServiceConfig, ServiceHealthChecks, HealthCheck } from '../types';
export declare class HealthService {
    private services;
    constructor(services: ServiceConfig);
    checkService(name: string, url: string): Promise<HealthCheck>;
    checkAllServices(): Promise<ServiceHealthChecks>;
}
//# sourceMappingURL=health.d.ts.map