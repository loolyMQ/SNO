import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, ErrorSeverity, StructuredError } from './index';
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
  private static instance: ErrorBoundary;
  private errorHandlers: Map<string, (error: Error, context?: unknown) => void> = new Map();

  static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  registerErrorHandler(service: string, handler: (error: Error, context?: unknown) => void): void {
    this.errorHandlers.set(service, handler);
  }

  handleError(error: Error, service: string, context?: unknown): StructuredError {
    const structuredError = this.createStructuredError(error, service, context);

    logger.error(
      {
        error: structuredError,
        service,
        context,
      },
      `Error in ${service}: ${error.message}`
    );

    const handler = this.errorHandlers.get(service);
    if (handler) {
      try {
        handler(error, context);
      } catch (handlerError) {
        logger.error({ handlerError }, 'Error handler failed');
      }
    }

    return structuredError;
  }

  private createStructuredError(error: Error, service: string, context?: unknown): StructuredError {
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
      context: context as Record<string, unknown>,
      stack: error.stack || '',
      retryable: this.isRetryableError(error),
      httpStatus: 500,
    };
  }

  private extractCorrelationId(context: unknown): string | undefined {
    if (context && typeof context === 'object' && 'correlationId' in context) {
      return context.correlationId as string;
    }
    return undefined;
  }

  private extractUserId(context: unknown): string | undefined {
    if (context && typeof context === 'object' && 'userId' in context) {
      return context.userId as string;
    }
    return undefined;
  }

  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [/timeout/i, /connection/i, /network/i, /temporary/i, /unavailable/i];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }
}

export const errorBoundaryMiddleware = (service: string) => {
  const errorBoundary = ErrorBoundary.getInstance();

  return (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const context = {
      correlationId: req.headers['x-correlation-id'] as string,
      userId: req.headers['x-user-id'] as string,
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

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
