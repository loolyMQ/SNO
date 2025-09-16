// Простая реализация middleware без внешних зависимостей
export interface Request {
  method: string;
  url: string;
  get: (header: string) => string | undefined;
  ip?: string;
}

export interface Response {
  statusCode: number;
  on: (event: string, callback: () => void) => void;
}

export interface NextFunction {
  (): void;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const route = req.url;

  // Измеряем размер запроса
  const contentLength = req.get('content-length');
  if (contentLength) {
    // Простая реализация без prom-client
    console.log(`Request size: ${contentLength} bytes for ${req.method} ${route}`);
  }

  // Перехватываем завершение ответа
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;

    console.log(
      JSON.stringify({
        type: 'http_request',
        method: req.method,
        route,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      }),
    );
  });

  next();
}

export function healthMiddleware(healthChecker: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.url === '/health' || req.url === '/health/ready') {
      try {
        const health = await healthChecker.getHealth();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        console.log(`Health check: ${health.status} (${statusCode})`);
        // В реальном приложении здесь был бы res.status(statusCode).json(health)
      } catch (error) {
        console.error('Health check failed:', error);
        // В реальном приложении здесь был бы res.status(503).json({...})
      }
    } else {
      next();
    }
  };
}
