import { Request, Response, NextFunction } from 'express';
import { StructuredError } from './index';
export declare class ErrorBoundary {
    private static instance;
    private errorHandlers;
    static getInstance(): ErrorBoundary;
    registerErrorHandler(service: string, handler: (error: Error, context?: unknown) => void): void;
    handleError(error: Error, service: string, context?: unknown): StructuredError;
    private createStructuredError;
    private extractCorrelationId;
    private extractUserId;
    private isRetryableError;
}
export declare const errorBoundaryMiddleware: (service: string) => (error: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncErrorHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error-boundary.d.ts.map