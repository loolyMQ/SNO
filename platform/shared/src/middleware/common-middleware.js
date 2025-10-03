import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
export class CommonMiddleware {
    logger;
    constructor(logger) {
        this.logger =
            logger ||
                pino({
                    level: process.env['LOG_LEVEL'] || 'info',
                });
    }
    static create(logger) {
        return new CommonMiddleware(logger);
    }
    setupSecurity(app, config = {}) {
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
                ...config.helmet?.contentSecurityPolicy,
            },
        }));
        app.use(cors({
            origin: config.cors?.origin ||
                process.env['CORS_ORIGINS']?.split(',') || ['http://localhost:3000'],
            credentials: config.cors?.credentials ?? true,
        }));
    }
    setupPerformance(app, config = {}) {
        if (config.compression !== false) {
            app.use(compression());
        }
    }
    setupRateLimit(app, config = {}) {
        if (config.rateLimit) {
            const limiter = rateLimit({
                windowMs: config.rateLimit.windowMs,
                max: config.rateLimit.max,
                message: config.rateLimit.message || 'Too many requests from this IP, please try again later.',
                standardHeaders: true,
                legacyHeaders: false,
            });
            app.use(limiter);
        }
    }
    setupLogging(app, config = {}) {
        const logLevel = config.logging?.level || process.env['LOG_LEVEL'] || 'info';
        const isPretty = config.logging?.pretty ?? process.env['NODE_ENV'] === 'development';
        const pinoConfig = {
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
    setupBodyParsing(app) {
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    }
    setupHealthCheck(app, serviceName) {
        app.get('/health', (req, res) => {
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
    setupMetrics(app, register) {
        app.get('/metrics', async (req, res) => {
            try {
                res.set('Content-Type', register.contentType || 'text/plain');
                res.end(await register.metrics());
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to retrieve metrics' });
            }
        });
    }
    setupErrorHandling(app) {
        app.use((err, req, res, next) => {
            this.logger.error({
                error: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            }, 'Unhandled error');
            if (res.headersSent) {
                return next(err);
            }
            res.status(err.status || 500).json({
                success: false,
                error: process.env['NODE_ENV'] === 'production' ? 'Internal Server Error' : err.message,
                ...(process.env['NODE_ENV'] !== 'production' && { stack: err.stack }),
            });
        });
    }
    setupNotFound(app) {
        app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Route not found',
                path: req.originalUrl,
                method: req.method,
            });
        });
    }
    setupAll(app, serviceName, config = {}) {
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
//# sourceMappingURL=common-middleware.js.map