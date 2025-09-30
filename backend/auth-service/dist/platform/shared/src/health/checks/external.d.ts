import { ExternalServiceHealthCheck } from '../types';
export declare function createExternalServiceHealthCheck(name: string, url: string, timeout?: number): Promise<ExternalServiceHealthCheck>;
export declare function checkMultipleExternalServices(services: Array<{
    name: string;
    url: string;
}>): Promise<ExternalServiceHealthCheck[]>;
//# sourceMappingURL=external.d.ts.map