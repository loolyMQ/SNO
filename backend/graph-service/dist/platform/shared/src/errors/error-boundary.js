import { AppError, ErrorCode, ErrorSeverity } from './index';
import pino from 'pino';
const logger = pino({
    level: process.env['LOG_LEVEL'] || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});
export class ErrorBoundary {
    static instance;
    errorHandlers = new Map();
    static getInstance() {
        if (!ErrorBoundary.instance) {
            ErrorBoundary.instance = new ErrorBoundary();
        }
        return ErrorBoundary.instance;
    }
    registerErrorHandler(service, handler) {
        this.errorHandlers.set(service, handler);
    }
    handleError(error, service, context) {
        const structuredError = this.createStructuredError(error, service, context);
        logger.error({
            error: structuredError,
            service,
            context,
        }, `Error in ${service}: ${error.message}`);
        const handler = this.errorHandlers.get(service);
        if (handler) {
            try {
                handler(error, context);
            }
            catch (handlerError) {
                logger.error({ handlerError }, 'Error handler failed');
            }
        }
        return structuredError;
    }
    createStructuredError(error, service, context) {
        if (error instanceof AppError) {
            return error.toStructuredError();
        }
        const correlationId = this.extractCorrelationId(context);
        const userId = this.extractUserId(context);
        return {
            code: ErrorCode.SYSTEM_DATABASE_ERROR,
            message: error.message,
            severity: ErrorSeverity.HIGH,
            timestamp: Date.now(),
            correlationId: correlationId || '',
            userId: userId || '',
            service,
            context: context,
            stack: error.stack || '',
            retryable: this.isRetryableError(error),
            httpStatus: 500,
        };
    }
    extractCorrelationId(context) {
        if (context && typeof context === 'object' && 'correlationId' in context) {
            return context.correlationId;
        }
        return undefined;
    }
    extractUserId(context) {
        if (context && typeof context === 'object' && 'userId' in context) {
            return context.userId;
        }
        return undefined;
    }
    isRetryableError(error) {
        const retryablePatterns = [/timeout/i, /connection/i, /network/i, /temporary/i, /unavailable/i];
        return retryablePatterns.some(pattern => pattern.test(error.message));
    }
}
export const errorBoundaryMiddleware = (service) => {
    const errorBoundary = ErrorBoundary.getInstance();
    return (error, req, res, next) => {
        const context = {
            correlationId: req.headers['x-correlation-id'],
            userId: req.headers['x-user-id'],
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
        };
        const structuredError = errorBoundary.handleError(error, service, context);
        if (res.headersSent) {
            return next(error);
        }
        res.status(structuredError.httpStatus).json({
            error: {
                code: structuredError.code,
                message: structuredError.message,
                correlationId: structuredError.correlationId,
                timestamp: structuredError.timestamp,
            },
        });
    };
};
export const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
//# sourceMappingURL=error-boundary.js.map