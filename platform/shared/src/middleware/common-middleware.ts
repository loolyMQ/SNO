import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';

export interface CommonMiddlewareConfig {
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  helmet?: {
    contentSecurityPolicy?: Record<string, unknown>;
  };
  compression?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
    message?: string;
  };
  logging?: {
    level?: string;
    pretty?: boolean;
  };
}

export class CommonMiddleware {
  private logger: pino.Logger;

  constructor(logger?: pino.Logger) {
    this.logger =
      logger ||
      pino({
        level: process.env['LOG_LEVEL'] || 'info',
      });
  }

  static create(logger?: pino.Logger): CommonMiddleware {
    return new CommonMiddleware(logger);
  }

  setupSecurity(app: Application, config: CommonMiddlewareConfig = {}): void {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
          ...config.helmet?.contentSecurityPolicy,
        },
      })
    );

    app.use(
      cors({
        origin: config.cors?.origin ||
          process.env['CORS_ORIGINS']?.split(',') || ['http://localhost:3000'],
        credentials: config.cors?.credentials ?? true,
      })
    );
  }

  setupPerformance(app: Application, config: CommonMiddlewareConfig = {}): void {
    if (config.compression !== false) {
      app.use(compression());
    }
  }

  setupRateLimit(app: Application, config: CommonMiddlewareConfig = {}): void {
    if (config.rateLimit) {
      const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message:
          config.rateLimit.message || 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      });
      app.use(limiter);
    }
  }

  setupLogging(app: Application, config: CommonMiddlewareConfig = {}): void {
    const logLevel = config.logging?.level || process.env['LOG_LEVEL'] || 'info';
    const isPretty = config.logging?.pretty ?? process.env['NODE_ENV'] === 'development';

    const pinoConfig: Record<string, unknown> = {
      logger: this.logger.child({ level: logLevel }),
    };

    if (isPretty) {
      pinoConfig['transport'] = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };
    }

    app.use(pinoHttp(pinoConfig));
  }

  setupBodyParsing(app: Application): void {
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupHealthCheck(app: Application, serviceName: string): void {
    app.get('/health', (_req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'healthy',
        service: serviceName,
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env['npm_package_version'] || '1.0.0',
      });
    });
  }

  setupMetrics(
    app: Application,
    register: { metrics: () => Promise<string>; contentType?: string }
  ): void {
    app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        res.set('Content-Type', register.contentType || 'text/plain');
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });
  }

  setupErrorHandling(app: Application): void {
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error(
        {
          error: err.message,
          stack: err.stack,
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
        'Unhandled error'
      );

      if (res.headersSent) {
        return next(err);
      }

      res.status((err as any).status || 500).json({
        success: false,
        error: process.env['NODE_ENV'] === 'production' ? 'Internal Server Error' : err.message,
        ...(process.env['NODE_ENV'] !== 'production' && { stack: err.stack }),
      });
    });
  }

  setupNotFound(app: Application): void {
    app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  setupAll(app: Application, serviceName: string, config: CommonMiddlewareConfig = {}): void {
    this.setupSecurity(app, config);
    this.setupPerformance(app, config);
    this.setupRateLimit(app, config);
    this.setupLogging(app, config);
    this.setupBodyParsing(app);
    this.setupHealthCheck(app, serviceName);
    this.setupErrorHandling(app);
    this.setupNotFound(app);
  }
}
