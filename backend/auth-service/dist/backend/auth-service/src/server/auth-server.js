import express from 'express';
import pino from 'pino';
import { register as promRegister } from 'prom-client';
import { KafkaClient, createRedisClient, ConnectionPoolManager, createPostgreSQLPool, createRedisPool, SecureJWTConfig, validateBody, userRegistrationSchema, userLoginSchema, logoutSchema, verifyTokenSchema, ApiVersioning, CorrelationMiddleware, EnvironmentValidator, CommonMiddleware, } from '@science-map/shared';
import { PooledUserRepository } from '../repositories/user-repository';
import { PooledEventService } from '../services/event-service';
import { PooledAuthService } from '../services/auth-service';
import { AuthController } from '../controllers/auth-controller';
export class AuthServer {
    app;
    logger;
    kafkaClient;
    redisClient;
    poolManager;
    authController;
    constructor() {
        this.app = express();
        this.logger = pino({
            level: process.env['LOG_LEVEL'] || 'info'
        });
    }
    async initialize() {
        this.validateEnvironment();
        this.validateJWTConfiguration();
        await this.initializeInfrastructure();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    validateEnvironment() {
        try {
            const envValidator = EnvironmentValidator.create(this.logger);
            const result = envValidator.validateServiceEnvironment('auth-service');
            if (!result.isValid) {
                this.logger.error('Environment validation failed:', {
                    errors: result.errors,
                    missing: result.missing
                });
                process.exit(1);
            }
            if (result.warnings.length > 0) {
                this.logger.warn('Environment validation warnings:', {
                    warnings: result.warnings
                });
            }
            this.logger.info('Environment validation completed successfully.');
        }
        catch (error) {
            this.logger.error('Environment validation failed:', error);
            process.exit(1);
        }
    }
    validateJWTConfiguration() {
        try {
            const jwtConfig = new SecureJWTConfig();
            if (!jwtConfig.isSecure()) {
                this.logger.warn('JWT configuration is not secure - check environment variables');
                this.logger.warn('Security recommendations:', jwtConfig.getSecurityRecommendations());
            }
            else {
                this.logger.info('JWT configuration is secure');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('JWT configuration validation failed:', errorMessage);
            throw new Error(`JWT configuration error: ${errorMessage}`);
        }
    }
    async initializeInfrastructure() {
        this.kafkaClient = new KafkaClient('auth-service', ['localhost:9092']);
        this.redisClient = createRedisClient('auth-service', {
            host: 'localhost',
            port: 6379,
            defaultTTL: 1800
        });
        this.poolManager = new ConnectionPoolManager();
        const dbPool = createPostgreSQLPool({
            name: 'auth-db-pool',
            min: 2,
            max: 10,
            acquireTimeoutMillis: 5000,
            createTimeoutMillis: 3000,
            destroyTimeoutMillis: 1000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 1000,
            maxRetries: 3,
            enableHealthCheck: true,
            healthCheckIntervalMs: 30000
        }, {
            host: 'localhost',
            port: 5432,
            database: 'science_map',
            user: 'postgres',
            password: 'postgres'
        }, this.logger);
        const redisPool = createRedisPool({
            name: 'auth-redis-pool',
            min: 2,
            max: 10,
            acquireTimeoutMillis: 5000,
            createTimeoutMillis: 3000,
            destroyTimeoutMillis: 1000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 1000,
            maxRetries: 3,
            enableHealthCheck: true,
            healthCheckIntervalMs: 30000
        }, {
            host: 'localhost',
            port: 6379
        }, this.logger);
        this.poolManager.registerPool('db', dbPool);
        this.poolManager.registerPool('redis', redisPool);
        await this.kafkaClient.connect();
        await this.redisClient.connect();
        const userRepository = new PooledUserRepository(dbPool, redisPool, this.logger);
        const eventService = new PooledEventService(null, this.logger);
        const authService = new PooledAuthService(userRepository, eventService, this.logger);
        this.authController = new AuthController(authService, this.logger);
    }
    setupMiddleware() {
        const commonMiddleware = CommonMiddleware.create(this.logger);
        commonMiddleware.setupAll(this.app, 'auth-service', {
            rateLimit: {
                windowMs: 15 * 60 * 1000,
                max: 100,
                message: 'Превышен лимит запросов'
            }
        });
        this.app.use(CorrelationMiddleware.createMiddleware('auth-service'));
        const { CentralizedVersionMiddleware } = require('@science-map/shared');
        CentralizedVersionMiddleware.initialize(this.logger);
        CentralizedVersionMiddleware.createForService({
            serviceName: 'auth-service',
            dependencies: {
                'express': '^4.18.0',
                'pino': '^8.0.0',
                'bcrypt': '^5.1.0',
                'jsonwebtoken': '^9.0.0'
            }
        });
        this.app.use(CentralizedVersionMiddleware.getMiddleware('auth-service'));
        CentralizedVersionMiddleware.setupRoutes(this.app, 'auth-service');
    }
    setupRoutes() {
        const versioning = ApiVersioning.createUrlVersioning();
        this.app.use('/api/v1/auth', versioning.middleware());
        this.app.use('/api/v2/auth', versioning.middleware());
        this.app.post('/api/v1/auth/register', validateBody(userRegistrationSchema), (req, res) => this.authController.register(req, res));
        this.app.post('/api/v1/auth/login', validateBody(userLoginSchema), (req, res) => this.authController.login(req, res));
        this.app.post('/api/v1/auth/logout', validateBody(logoutSchema), (req, res) => this.authController.logout(req, res));
        this.app.post('/api/v1/auth/verify', validateBody(verifyTokenSchema), (req, res) => this.authController.verify(req, res));
        this.app.get('/api/v1/auth/statistics', (req, res) => this.authController.statistics(req, res));
        this.app.post('/api/v2/auth/register', validateBody(userRegistrationSchema), (req, res) => this.authController.register(req, res));
        this.app.post('/api/v2/auth/login', validateBody(userLoginSchema), (req, res) => this.authController.login(req, res));
        this.app.post('/api/v2/auth/logout', validateBody(logoutSchema), (req, res) => this.authController.logout(req, res));
        this.app.post('/api/v2/auth/verify', validateBody(verifyTokenSchema), (req, res) => this.authController.verify(req, res));
        this.app.get('/api/v2/auth/statistics', (req, res) => this.authController.statistics(req, res));
        this.app.get('/health', async (_req, res) => {
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                kafka: this.kafkaClient ? 'connected' : 'disconnected',
                redis: this.redisClient ? await this.redisClient.isReady() : false,
                pools: await this.poolManager.getAllStats()
            };
            res.json(healthData);
        });
        this.app.get('/metrics', async (_req, res) => {
            res.set('Content-Type', promRegister.contentType);
            res.end(await promRegister.metrics());
        });
    }
    setupErrorHandling() {
        this.app.use((error, _req, res, _next) => {
            this.logger.error('Unhandled error:', error);
            res.status(500).json({
                success: false,
                error: 'Внутренняя ошибка сервера'
            });
        });
    }
    async start(port = 3003) {
        await this.initialize();
        return new Promise((resolve) => {
            const server = this.app.listen(port, () => {
                this.logger.info(`Auth Service started on port ${port}`);
                resolve();
            });
            const gracefulShutdown = async (signal) => {
                this.logger.info(`Received ${signal}, shutting down gracefully...`);
                server.close(async () => {
                    try {
                        await this.kafkaClient.disconnect();
                        await this.redisClient.disconnect();
                        await this.poolManager.shutdownAll();
                        this.logger.info('Graceful shutdown completed');
                        process.exit(0);
                    }
                    catch (error) {
                        this.logger.error('Error during shutdown:', error);
                        process.exit(1);
                    }
                });
            };
            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        });
    }
}
//# sourceMappingURL=auth-server.js.map