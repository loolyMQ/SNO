import { injectable } from 'inversify';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface MetricsMiddlewareRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export interface MetricsMiddlewareResponse {
  status: number;
  message: string;
}

@injectable()
export class MetricsMiddleware extends BaseService {
  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    super(logger, metrics);
  }

  async recordRequest(request: MetricsMiddlewareRequest): Promise<void> {
    await this.executeWithMetrics('metrics_middleware.record_request', async () => {
      this.metrics.incrementCounter('http_requests_total', {
        method: request.method,
        endpoint: this.getEndpointFromUrl(request.url),
        status: 'started'
      });
    });
  }

  async recordResponse(request: MetricsMiddlewareRequest, response: MetricsMiddlewareResponse, duration: number): Promise<void> {
    await this.executeWithMetrics('metrics_middleware.record_response', async () => {
      this.metrics.incrementCounter('http_requests_total', {
        method: request.method,
        endpoint: this.getEndpointFromUrl(request.url),
        status: response.status.toString()
      });

      this.metrics.recordHistogram('http_request_duration_seconds', duration / 1000, {
        method: request.method,
        endpoint: this.getEndpointFromUrl(request.url),
        status: response.status.toString()
      });
    });
  }

  async recordError(request: MetricsMiddlewareRequest, error: Error): Promise<void> {
    await this.executeWithMetrics('metrics_middleware.record_error', async () => {
      this.metrics.incrementCounter('http_errors_total', {
        method: request.method,
        endpoint: this.getEndpointFromUrl(request.url),
        error_type: error.constructor.name
      });
    });
  }

  async recordUserActivity(userId: string, activity: string): Promise<void> {
    await this.executeWithMetrics('metrics_middleware.record_user_activity', async () => {
      this.metrics.incrementCounter('user_activity_total', {
        user_id: userId,
        activity
      });
    });
  }

  async recordDatabaseOperation(operation: string, table: string, duration: number): Promise<void> {
    await this.executeWithMetrics('metrics_middleware.record_database_operation', async () => {
      this.metrics.incrementCounter('database_operations_total', {
        operation,
        table
      });

      this.metrics.recordHistogram('database_operation_duration_seconds', duration / 1000, {
        operation,
        table
      });
    });
  }

  async recordCacheOperation(operation: string, cacheType: string, hit: boolean): Promise<void> {
    await this.executeWithMetrics('metrics_middleware.record_cache_operation', async () => {
      this.metrics.incrementCounter('cache_operations_total', {
        operation,
        cache_type: cacheType,
        hit: hit.toString()
      });
    });
  }

  private getEndpointFromUrl(url: string): string {
    // Extract endpoint from URL for metrics
    const path = url.split('?')[0] || '';
    return path.replace(/\/\d+/g, '/:id'); // Replace numeric IDs with :id
  }
}
