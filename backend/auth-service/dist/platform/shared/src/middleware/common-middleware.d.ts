import { Application } from 'express';
import pino from 'pino';
export interface CommonMiddlewareConfig {
    cors?: {
        origin?: string | string[];
        credentials?: boolean;
    };
    helmet?: {
        contentSecurityPolicy?: Record<string, unknown>;
    };
    compression?: boolean;
    rateLimit?: {
        windowMs: number;
        max: number;
        message?: string;
    };
    logging?: {
        level?: string;
        pretty?: boolean;
    };
}
export declare class CommonMiddleware {
    private logger;
    constructor(logger?: pino.Logger);
    static create(logger?: pino.Logger): CommonMiddleware;
    setupSecurity(app: Application, config?: CommonMiddlewareConfig): void;
    setupPerformance(app: Application, config?: CommonMiddlewareConfig): void;
    setupRateLimit(app: Application, config?: CommonMiddlewareConfig): void;
    setupLogging(app: Application, config?: CommonMiddlewareConfig): void;
    setupBodyParsing(app: Application): void;
    setupHealthCheck(app: Application, serviceName: string): void;
    setupMetrics(app: Application, register: {
        metrics: () => Promise<string>;
        contentType?: string;
    }): void;
    setupErrorHandling(app: Application): void;
    setupNotFound(app: Application): void;
    setupAll(app: Application, serviceName: string, config?: CommonMiddlewareConfig): void;
}
//# sourceMappingURL=common-middleware.d.ts.map