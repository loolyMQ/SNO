import { AppError, ErrorCode } from './index';
export interface StandardizedErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        severity: string;
        timestamp: string;
        correlationId?: string;
        details?: Record<string, unknown>;
        retryable: boolean;
        httpStatus: number;
    };
}
export declare class StandardizedErrorHandler {
    static createErrorResponse(error: Error | AppError, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
    static createAuthError(code: ErrorCode, message: string, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
    static createValidationError(message: string, field?: string, correlationId?: string): StandardizedErrorResponse;
    static createSystemError(code: ErrorCode, message: string, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
    static createExternalServiceError(service: string, message: string, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
    static createRateLimitError(correlationId?: string, retryAfter?: number): StandardizedErrorResponse;
    static createNotFoundError(resource: string, id?: string, correlationId?: string): StandardizedErrorResponse;
    static createPermissionError(action: string, resource: string, correlationId?: string): StandardizedErrorResponse;
    static createTimeoutError(operation: string, timeout: number, correlationId?: string): StandardizedErrorResponse;
    static createDatabaseError(operation: string, table: string, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
    static createKafkaError(topic: string, operation: string, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
    static createRedisError(operation: string, key?: string, correlationId?: string, details?: Record<string, unknown>): StandardizedErrorResponse;
}
//# sourceMappingURL=standardized-errors.d.ts.map