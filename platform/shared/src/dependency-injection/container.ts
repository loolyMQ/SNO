import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';

// Services
// import { DatabaseService } from '../database/database.service';
import { CacheService } from '../cache/cache.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { HealthService } from '../health/health.service';
import { SecurityService } from '../security/security.service';
import { ValidationService } from '../validation/validation.service';
import { RetryService } from '../retry/retry.service';
import { EventService } from '../events/event.service';
import { ConfigService } from '../config/config.service';

// Repositories
import { UserRepository } from '../repositories/user.repository';
import { GraphRepository } from '../repositories/graph.repository';
import { SearchRepository } from '../repositories/search.repository';
import { JobRepository } from '../repositories/job.repository';

// Controllers
import { AuthController } from '../controllers/auth.controller';
import { GraphController } from '../controllers/graph.controller';
import { SearchController } from '../controllers/search.controller';
import { JobController } from '../controllers/job.controller';

// Middleware
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { LoggingMiddleware } from '../middleware/logging.middleware';
import { MetricsMiddleware } from '../middleware/metrics.middleware';

// Create container
export const container = new Container();

// Bind services
// container.bind<DatabaseService>(TYPES.DatabaseService).to(DatabaseService).inSingletonScope();
container.bind<CacheService>(TYPES.CacheService).to(CacheService).inSingletonScope();
container.bind<LoggerService>(TYPES.LoggerService).to(LoggerService).inSingletonScope();
container.bind<MetricsService>(TYPES.MetricsService).to(MetricsService).inSingletonScope();
container.bind<HealthService>(TYPES.HealthService).to(HealthService).inSingletonScope();
container.bind<SecurityService>(TYPES.SecurityService).to(SecurityService).inSingletonScope();
container.bind<ValidationService>(TYPES.ValidationService).to(ValidationService).inSingletonScope();
container.bind<RetryService>(TYPES.RetryService).to(RetryService).inSingletonScope();
container.bind<EventService>(TYPES.EventService).to(EventService).inSingletonScope();
container.bind<ConfigService>(TYPES.ConfigService).to(ConfigService).inSingletonScope();

// Bind repositories
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository).inSingletonScope();
container.bind<GraphRepository>(TYPES.GraphRepository).to(GraphRepository).inSingletonScope();
container.bind<SearchRepository>(TYPES.SearchRepository).to(SearchRepository).inSingletonScope();
container.bind<JobRepository>(TYPES.JobRepository).to(JobRepository).inSingletonScope();

// Bind controllers
container.bind<AuthController>(TYPES.AuthController).to(AuthController).inSingletonScope();
container.bind<GraphController>(TYPES.GraphController).to(GraphController).inSingletonScope();
container.bind<SearchController>(TYPES.SearchController).to(SearchController).inSingletonScope();
container.bind<JobController>(TYPES.JobController).to(JobController).inSingletonScope();

// Bind middleware
container.bind<AuthMiddleware>(TYPES.AuthMiddleware).to(AuthMiddleware).inSingletonScope();
container.bind<ValidationMiddleware>(TYPES.ValidationMiddleware).to(ValidationMiddleware).inSingletonScope();
container.bind<LoggingMiddleware>(TYPES.LoggingMiddleware).to(LoggingMiddleware).inSingletonScope();
container.bind<MetricsMiddleware>(TYPES.MetricsMiddleware).to(MetricsMiddleware).inSingletonScope();

export default container;
