import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface LoggingMiddlewareRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export interface LoggingMiddlewareResponse {
  status: number;
  message: string;
  duration?: number;
}

@injectable()
export class LoggingMiddleware extends BaseService {
  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    super(logger, metrics);
  }

  async logRequest(request: LoggingMiddlewareRequest): Promise<void> {
    await this.executeWithMetrics('logging_middleware.log_request', async () => {
      this.logger.info('Incoming request', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        userId: request.user?.id,
        ip: request.headers['x-forwarded-for'] || request.headers['x-real-ip']
      });
    });
  }

  async logResponse(request: LoggingMiddlewareRequest, response: LoggingMiddlewareResponse, duration: number): Promise<void> {
    await this.executeWithMetrics('logging_middleware.log_response', async () => {
      this.logger.info('Request completed', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration,
        userId: request.user?.id
      });
    });
  }

  async logError(request: LoggingMiddlewareRequest, error: Error): Promise<void> {
    await this.executeWithMetrics('logging_middleware.log_error', async () => {
      this.logger.error('Request error', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
        stack: error.stack,
        userId: request.user?.id
      });
    });
  }

  async logSecurityEvent(event: string, request: LoggingMiddlewareRequest, details?: unknown): Promise<void> {
    await this.executeWithMetrics('logging_middleware.log_security_event', async () => {
      this.logger.warn('Security event', {
        event,
        method: request.method,
        url: request.url,
        userId: request.user?.id,
        ip: request.headers['x-forwarded-for'] || request.headers['x-real-ip'],
        details
      });
    });
  }

  async logPerformance(operation: string, duration: number, metadata?: unknown): Promise<void> {
    await this.executeWithMetrics('logging_middleware.log_performance', async () => {
      this.logger.info('Performance metric', {
        operation,
        duration,
        metadata
      });
    });
  }
}
