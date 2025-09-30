import { Request, Response, NextFunction } from 'express';
export interface CorrelationContext {
    correlationId: string;
    requestId: string;
    userId?: string;
    service: string;
    operation?: string;
    startTime: number;
}
export declare class CorrelationMiddleware {
    private static readonly CORRELATION_HEADER;
    private static readonly REQUEST_HEADER;
    private static readonly USER_HEADER;
    static createMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static createServiceMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static createKafkaMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static createDatabaseMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static createExternalServiceMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static createAuditMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static createMetricsMiddleware(serviceName: string): (req: Request, _res: Response, next: NextFunction) => void;
    static getCorrelationId(req: Request): string | undefined;
    static getRequestId(req: Request): string | undefined;
    static getUserId(req: Request): string | undefined;
    static getContext(req: Request): CorrelationContext | undefined;
    static createChildContext(parentContext: CorrelationContext, operation: string): CorrelationContext;
}
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
            requestId?: string;
            userId?: string;
            correlationContext?: CorrelationContext;
            logger?: {
                info: (msg: string) => void;
                error: (msg: string) => void;
            };
        }
    }
}
//# sourceMappingURL=correlation-middleware.d.ts.map