import { Request, Response, NextFunction } from 'express';
import { HttpMetrics } from '../metrics';

export class ExpressMonitoringMiddleware {
  private httpMetrics: HttpMetrics;

  constructor(httpMetrics: HttpMetrics) {
    this.httpMetrics = httpMetrics;
  }

  // Middleware для отслеживания HTTP запросов
  requestMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const method = req.method;
      const route = this.getRoutePattern(req);

      // Увеличиваем счетчик активных запросов
      this.httpMetrics.incrementActiveRequests(method, route);

      // Перехватываем событие завершения ответа
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000; // в секундах
        const statusCode = res.statusCode;

        // Записываем метрики
        this.httpMetrics.recordRequest(method, route, statusCode, duration);

        // Уменьшаем счетчик активных запросов
        this.httpMetrics.decrementActiveRequests(method, route);
      });

      next();
    };
  }

  // Middleware для отслеживания ошибок
  errorMiddleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const method = req.method;
      const route = this.getRoutePattern(req);
      const startTime = (req as any).startTime || Date.now();

      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode || 500;

      // Записываем метрики для ошибки
      this.httpMetrics.recordRequest(method, route, statusCode, duration);

      // Уменьшаем счетчик активных запросов
      this.httpMetrics.decrementActiveRequests(method, route);

      next(error);
    };
  }

  // Получение паттерна маршрута (без параметров)
  private getRoutePattern(req: Request): string {
    const route = req.route?.path || req.path;
    
    // Заменяем параметры на плейсхолдеры
    return route
      .replace(/:\w+/g, ':id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUID
      .replace(/\/[a-f0-9-]{24}/g, '/:objectId'); // MongoDB ObjectId
  }
}

// Middleware для добавления времени начала запроса
export function addStartTime(req: Request, res: Response, next: NextFunction) {
  (req as any).startTime = Date.now();
  next();
}
