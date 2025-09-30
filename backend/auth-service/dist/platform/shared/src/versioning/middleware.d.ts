import { Request, Response, NextFunction } from 'express';
import { VersioningEngine } from './engine';
import { VersioningConfig } from './types';
declare global {
    namespace Express {
        interface Request {
            versioning?: VersioningEngine;
            apiVersion?: string;
            versionedRequest?: Record<string, unknown>;
        }
    }
}
export declare class VersioningMiddleware {
    private static instance;
    private engine;
    private constructor();
    static getInstance(config: VersioningConfig): VersioningMiddleware;
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    versionValidator(requiredVersions?: string[]): (req: Request, res: Response, next: NextFunction) => void;
    deprecationWarning(): (req: Request, res: Response, next: NextFunction) => void;
    sunsetWarning(): (req: Request, res: Response, next: NextFunction) => void;
    versionedResponse(): (req: Request, res: Response, next: NextFunction) => void;
    private getDeprecationDate;
    private getSunsetDate;
}
//# sourceMappingURL=middleware.d.ts.map