import { Request, Response } from 'express';
import { HealthService } from '../services/health';
import { services } from '../config';
import { asyncErrorHandler } from '@science-map/shared';

const healthService = new HealthService(services);

export const getHealth = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
  const healthChecks = await healthService.checkAllServices();
  
  const allHealthy = Object.values(healthChecks).every(check => check.success);
  const status = allHealthy ? 200 : 503;
  
  res.status(status).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: Date.now(),
    services: healthChecks
  });
});

export const getGatewayHealth = (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env['npm_package_version'] || '1.0.0'
  });
};
