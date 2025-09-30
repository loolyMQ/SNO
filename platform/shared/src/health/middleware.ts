import { Request, Response, NextFunction } from 'express';
import { HealthChecker } from './checker';
// import { HealthCheckResult } from './types';

export interface HealthCheckMiddlewareOptions {
  path?: string;
  includeDetails?: boolean;
  customChecks?: Array<{ name: string; check: () => Promise<any> }>;
}

export function createHealthCheckMiddleware(
  healthChecker: HealthChecker,
  options: HealthCheckMiddlewareOptions = {}
) {
  const { path = '/health', includeDetails = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== path) {
      return next();
    }

    try {
      const result = await healthChecker.performHealthCheck();

      const statusCode =
        result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

      const responseData: Record<string, unknown> = {
        status: result.status,
        timestamp: result.timestamp,
        uptime: result.uptime,
        version: result.version,
        environment: result.environment,
      };

      if (includeDetails || req.query['details'] === 'true') {
        responseData['checks'] = result['checks'];
        responseData['metadata'] = result['metadata'];
      }

      if (req.query['check']) {
        const checkName = req.query['check'] as string;
        const check = result['checks'].find((c: any) => c.name === checkName);
        if (check) {
          responseData['check'] = check;
        } else {
          return res.status(404).json({ error: 'Check not found' });
        }
      }

      res.status(statusCode).json(responseData);
    } catch (error: unknown) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export function createReadinessMiddleware(
  healthChecker: HealthChecker,
  options: HealthCheckMiddlewareOptions = {}
) {
  const { path = '/ready', includeDetails = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== path) {
      return next();
    }

    try {
      const result = await healthChecker.performHealthCheck();

      const criticalChecks = result.checks.filter(
        check => check.name === 'database' || check.name === 'redis'
      );

      const isReady = criticalChecks.every(check => check.status === 'healthy');
      const statusCode = isReady ? 200 : 503;

      const responseData: Record<string, unknown> = {
        ready: isReady,
        timestamp: result.timestamp,
        criticalChecks: criticalChecks.length,
        healthyChecks: criticalChecks.filter(c => c.status === 'healthy').length,
      };

      if (includeDetails || req.query['details'] === 'true') {
        responseData['checks'] = criticalChecks;
      }

      res.status(statusCode).json(responseData);
    } catch (error: unknown) {
      res.status(500).json({
        ready: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export function createLivenessMiddleware(options: { path?: string } = {}) {
  const { path = '/live' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== path) {
      return next();
    }

    res.status(200).json({
      alive: true,
      timestamp: Date.now(),
      uptime: process.uptime(),
      pid: process.pid,
    });
  };
}
