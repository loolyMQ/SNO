import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { VersionMiddleware } from '../versioning/version-middleware';
export interface CentralizedVersionConfig {
    serviceName: string;
    version?: string;
    buildTime?: string;
    gitCommit?: string;
    gitBranch?: string;
    environment?: string;
    dependencies?: Record<string, string>;
    enableVersionHeader?: boolean;
    enableCompatibilityCheck?: boolean;
    enableHealthCheck?: boolean;
}
export declare class CentralizedVersionMiddleware {
    private static instances;
    private static logger;
    static initialize(logger?: pino.Logger): void;
    static createForService(config: CentralizedVersionConfig): VersionMiddleware;
    private static getDefaultDependencies;
    static getMiddleware(serviceName: string): (req: Request, res: Response, next: NextFunction) => void;
    static setupRoutes(app: unknown, serviceName: string): void;
    static getVersionInfo(serviceName: string): Record<string, unknown>;
    static getAllServices(): string[];
    static clearCache(): void;
}
//# sourceMappingURL=centralized-version-middleware.d.ts.map