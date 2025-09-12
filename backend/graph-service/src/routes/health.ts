import { Router } from 'express';
import { ApiResponse } from '@science-map/shared';

const router = Router();

router.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      service: 'Graph Service',
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    },
    timestamp: Date.now(),
  };
  
  res.json(response);
});

router.get('/ready', (req, res) => {
  const isReady = true;
  
  const response: ApiResponse = {
    success: isReady,
    data: {
      service: 'Graph Service',
      status: isReady ? 'ready' : 'not ready',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };
  
  res.status(isReady ? 200 : 503).json(response);
});

export { router as healthRoutes };
