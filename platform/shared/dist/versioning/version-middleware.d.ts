import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
export interface VersionMiddlewareConfig {
    serviceName: string;
    version: string;
    buildTime: string;
    gitCommit?: string;
    gitBranch?: string;
    environment: string;
    dependencies: Record<string, string>;
    enableVersionHeader?: boolean;
    enableCompatibilityCheck?: boolean;
    enableHealthCheck?: boolean;
}
export declare class VersionMiddleware {
    private serviceVersioning;
    private config;
    private logger;
    constructor(config: VersionMiddlewareConfig, logger?: pino.Logger);
    static create(config: VersionMiddlewareConfig, logger?: pino.Logger): VersionMiddleware;
    private registerService;
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    versionEndpoint(): (_req: Request, res: Response) => void;
    compatibilityEndpoint(): (_req: Request, res: Response) => void;
    healthEndpoint(): (_req: Request, res: Response) => void;
    setupRoutes(app: {
        get: (path: string, handler: (req: Request, res: Response) => void) => void;
    }): void;
    getVersionInfo(): any;
}
declare global {
    namespace Express {
        interface Request {
            serviceVersion?: {
                name: string;
                version: string;
                environment: string;
            };
        }
    }
}
//# sourceMappingURL=version-middleware.d.ts.map