import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

export class GatewayMiddleware {
  // Request logging middleware
  requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }, 'Request completed');
    });
    
    next();
  };

  // CORS middleware
  cors = (req: Request, res: Response, next: NextFunction): void => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  };

  // Security headers middleware
  securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    next();
  };

  // Rate limiting middleware
  rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
    
    // This would be implemented with Redis in production
    // For now, we'll use the gateway service's rate limiting
    next();
  };

  // Error handling middleware
  errorHandler = (err: Error, req: Request, res: Response): void => {
    logger.error({
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      ip: req.ip
    }, 'Gateway middleware error');
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now()
      });
    }
  };
}
