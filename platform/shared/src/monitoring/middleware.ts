import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitor } from './performance-monitor';

export function createMonitoringMiddleware(performanceMonitor: PerformanceMonitor) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (body: unknown) {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode;
      // const _method = req.method;
      // const _route = req.route?.path || req.path;

      performanceMonitor.recordRequest(duration, 'http_request');

      if (statusCode >= 400) {
        const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
        performanceMonitor.recordError(errorType, statusCode >= 500 ? 'high' : 'medium');
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

export function createDatabaseMonitoringMiddleware(performanceMonitor: PerformanceMonitor) {
  return (operation: string, table: string, queryFn: () => Promise<unknown>) => {
    return async (..._args: unknown[]) => {
      const startTime = Date.now();

      try {
        const result = await queryFn();
        const duration = (Date.now() - startTime) / 1000;

        performanceMonitor.recordDatabaseQuery(operation, table, duration, 'success');
        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;

        performanceMonitor.recordDatabaseQuery(operation, table, duration, 'error');
        performanceMonitor.recordError('database_error', 'high');

        throw error;
      }
    };
  };
}

export function createCacheMonitoringMiddleware(performanceMonitor: PerformanceMonitor) {
  return (cacheName: string) => {
    let hits = 0;
    let misses = 0;

    return {
      recordHit: () => {
        hits++;
        const hitRate = (hits / (hits + misses)) * 100;
        performanceMonitor.setCacheHitRate(cacheName, hitRate);
      },

      recordMiss: () => {
        misses++;
        const hitRate = (hits / (hits + misses)) * 100;
        performanceMonitor.setCacheHitRate(cacheName, hitRate);
      },

      getStats: () => ({
        hits,
        misses,
        hitRate: (hits / (hits + misses)) * 100,
      }),
    };
  };
}

export function createQueueMonitoringMiddleware(performanceMonitor: PerformanceMonitor) {
  return (queueName: string) => {
    return {
      setQueueSize: (size: number) => {
        performanceMonitor.setQueueSize(queueName, size);
      },

      recordQueueOperation: (operation: string, duration: number, success: boolean) => {
        performanceMonitor.recordRequest(duration, `queue_${operation}`);

        if (!success) {
          performanceMonitor.recordError(`queue_${operation}_error`, 'medium');
        }
      },
    };
  };
}
