import { AppError, ErrorCode, ErrorSeverity } from './index';
export class StandardizedErrorHandler {
    static createErrorResponse(error, correlationId, details) {
        if (error instanceof AppError) {
            return {
                success: false,
                error: {
                    code: error.code,
                    message: error instanceof Error ? error.message : String(error),
                    severity: error.severity,
                    timestamp: new Date().toISOString(),
                    correlationId: correlationId || '',
                    details: { ...error.context, ...details },
                    retryable: error.retryable,
                    httpStatus: error.httpStatus || 500,
                },
            };
        }
        return {
            success: false,
            error: {
                code: ErrorCode.SYSTEM_NETWORK_ERROR,
                message: (error instanceof Error ? error.message : String(error)) || 'Internal server error',
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: details || {},
                retryable: false,
                httpStatus: 500,
            },
        };
    }
    static createAuthError(code, message, correlationId, details) {
        return {
            success: false,
            error: {
                code,
                message,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: details || {},
                retryable: false,
                httpStatus: 401,
            },
        };
    }
    static createValidationError(message, field, correlationId) {
        return {
            success: false,
            error: {
                code: ErrorCode.VALIDATION_INVALID_INPUT,
                message,
                severity: ErrorSeverity.MEDIUM,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: field ? { field } : {},
                retryable: false,
                httpStatus: 400,
            },
        };
    }
    static createSystemError(code, message, correlationId, details) {
        return {
            success: false,
            error: {
                code,
                message,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: details || {},
                retryable: true,
                httpStatus: 500,
            },
        };
    }
    static createExternalServiceError(service, message, correlationId, details) {
        return {
            success: false,
            error: {
                code: ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
                message: `${service}: ${message}`,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: { service, ...details },
                retryable: true,
                httpStatus: 503,
            },
        };
    }
    static createRateLimitError(correlationId, retryAfter) {
        return {
            success: false,
            error: {
                code: ErrorCode.SYSTEM_RATE_LIMIT_EXCEEDED,
                message: 'Rate limit exceeded',
                severity: ErrorSeverity.MEDIUM,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: retryAfter ? { retryAfter } : {},
                retryable: true,
                httpStatus: 429,
            },
        };
    }
    static createNotFoundError(resource, id, correlationId) {
        return {
            success: false,
            error: {
                code: ErrorCode.AUTH_USER_NOT_FOUND,
                message: `${resource} not found`,
                severity: ErrorSeverity.MEDIUM,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: id ? { resource, id } : { resource },
                retryable: false,
                httpStatus: 404,
            },
        };
    }
    static createPermissionError(action, resource, correlationId) {
        return {
            success: false,
            error: {
                code: ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
                message: `Insufficient permissions to ${action} ${resource}`,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: { action, resource },
                retryable: false,
                httpStatus: 403,
            },
        };
    }
    static createTimeoutError(operation, timeout, correlationId) {
        return {
            success: false,
            error: {
                code: ErrorCode.SYSTEM_NETWORK_ERROR,
                message: `${operation} timed out after ${timeout}ms`,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: { operation, timeout },
                retryable: true,
                httpStatus: 504,
            },
        };
    }
    static createDatabaseError(operation, table, correlationId, details) {
        return {
            success: false,
            error: {
                code: ErrorCode.SYSTEM_DATABASE_ERROR,
                message: `Database error during ${operation}`,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: { operation, table, ...details },
                retryable: true,
                httpStatus: 500,
            },
        };
    }
    static createKafkaError(topic, operation, correlationId, details) {
        return {
            success: false,
            error: {
                code: ErrorCode.SYSTEM_KAFKA_ERROR,
                message: `Kafka error during ${operation} on topic ${topic}`,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: { topic, operation, ...details },
                retryable: true,
                httpStatus: 500,
            },
        };
    }
    static createRedisError(operation, key, correlationId, details) {
        return {
            success: false,
            error: {
                code: ErrorCode.SYSTEM_REDIS_ERROR,
                message: `Redis error during ${operation}`,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date().toISOString(),
                correlationId: correlationId || '',
                details: { operation, key, ...details },
                retryable: true,
                httpStatus: 500,
            },
        };
    }
}
//# sourceMappingURL=standardized-errors.js.map