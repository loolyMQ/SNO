import { Request, Response } from 'express';
import { ServiceConfig } from '../types';
export declare class ProxyService {
    private services;
    private httpClients;
    constructor(services: ServiceConfig);
    private initializeHttpClients;
    proxyRequest(req: Request, res: Response, serviceName: keyof ServiceConfig, path: string): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=proxy.d.ts.map