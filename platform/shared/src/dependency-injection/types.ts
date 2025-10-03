export const TYPES = {
  // Services
  DatabaseService: Symbol.for('DatabaseService'),
  CacheService: Symbol.for('CacheService'),
  LoggerService: Symbol.for('LoggerService'),
  MetricsService: Symbol.for('MetricsService'),
  HealthService: Symbol.for('HealthService'),
  SecurityService: Symbol.for('SecurityService'),
  ValidationService: Symbol.for('ValidationService'),
  RetryService: Symbol.for('RetryService'),
  EventService: Symbol.for('EventService'),
  ConfigService: Symbol.for('ConfigService'),
  
  // Cache Services
  MemoryCacheService: Symbol.for('MemoryCacheService'),
  RedisCacheService: Symbol.for('RedisCacheService'),
  MultiLevelCacheService: Symbol.for('MultiLevelCacheService'),
  
  // Database Services
  ConnectionPoolService: Symbol.for('ConnectionPoolService'),
  IndexManagerService: Symbol.for('IndexManagerService'),
  
  // CQRS Services
  CommandService: Symbol.for('CommandService'),
  QueryService: Symbol.for('QueryService'),
  
  // Saga Service
  SagaService: Symbol.for('SagaService'),
  
  // Circuit Breaker
  CircuitBreakerService: Symbol.for('CircuitBreakerService'),
  
  // Event Bus
  EventBusService: Symbol.for('EventBusService'),

  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  GraphRepository: Symbol.for('GraphRepository'),
  SearchRepository: Symbol.for('SearchRepository'),
  JobRepository: Symbol.for('JobRepository'),

  // Controllers
  AuthController: Symbol.for('AuthController'),
  GraphController: Symbol.for('GraphController'),
  SearchController: Symbol.for('SearchController'),
  JobController: Symbol.for('JobController'),

  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),
  ValidationMiddleware: Symbol.for('ValidationMiddleware'),
  LoggingMiddleware: Symbol.for('LoggingMiddleware'),
  MetricsMiddleware: Symbol.for('MetricsMiddleware'),

  // External Services
  RedisClient: Symbol.for('RedisClient'),
  PrismaClient: Symbol.for('PrismaClient'),
  KafkaProducer: Symbol.for('KafkaProducer'),
  KafkaConsumer: Symbol.for('KafkaConsumer'),
  ElasticsearchClient: Symbol.for('ElasticsearchClient'),
  Neo4jDriver: Symbol.for('Neo4jDriver'),
} as const;

export type ServiceTypes = typeof TYPES;
