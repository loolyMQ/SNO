import { Request, Response, NextFunction } from 'express';
import { HealthChecker } from './checker';
export interface HealthCheckMiddlewareOptions {
    path?: string;
    includeDetails?: boolean;
    customChecks?: Array<{
        name: string;
        check: () => Promise<unknown>;
    }>;
}
export declare function createHealthCheckMiddleware(healthChecker: HealthChecker, options?: HealthCheckMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<unknown, Record<string, unknown>>>;
export declare function createReadinessMiddleware(healthChecker: HealthChecker, options?: HealthCheckMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function createLivenessMiddleware(options?: {
    path?: string;
}): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=middleware.d.ts.map