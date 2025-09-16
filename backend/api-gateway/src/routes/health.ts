import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@science-map/shared';

const router: Router = Router();

router.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      service: 'API Gateway',
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
  // Проверка готовности сервиса
  const isReady = true; // Здесь можно добавить проверки зависимостей

  const response: ApiResponse = {
    success: isReady,
    data: {
      service: 'API Gateway',
      status: isReady ? 'ready' : 'not ready',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  res.status(isReady ? 200 : 503).json(response);
});

export { router as healthRoutes };
