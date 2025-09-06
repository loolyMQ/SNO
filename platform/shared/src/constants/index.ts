// Общие константы для всех сервисов

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const LOG_LEVELS = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

export const SERVICE_NAMES = {
  API_GATEWAY: 'api-gateway',
  AUTH_SERVICE: 'auth-service',
  GRAPH_SERVICE: 'graph-service',
  JOBS_SERVICE: 'jobs-service',
  SEARCH_SERVICE: 'search-service',
} as const;

export const DEFAULT_PORTS = {
  API_GATEWAY: 3001,
  AUTH_SERVICE: 3002,
  GRAPH_SERVICE: 3003,
  JOBS_SERVICE: 3004,
  SEARCH_SERVICE: 3005,
} as const;

export const DATABASE_TABLES = {
  USERS: 'users',
  INSTITUTES: 'institutes',
  DEPARTMENTS: 'departments',
  RESEARCHERS: 'researchers',
  PUBLICATIONS: 'publications',
  CONNECTIONS: 'connections',
} as const;

export const CACHE_KEYS = {
  USER_SESSION: 'user:session:',
  SEARCH_RESULTS: 'search:results:',
  GRAPH_DATA: 'graph:data:',
  API_RESPONSE: 'api:response:',
} as const;

export const CACHE_TTL = {
  SHORT: 300, // 5 минут
  MEDIUM: 1800, // 30 минут
  LONG: 3600, // 1 час
  VERY_LONG: 86400, // 24 часа
} as const;

export const RATE_LIMITS = {
  API: {
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 попыток входа
  },
  SEARCH: {
    windowMs: 60 * 1000, // 1 минута
    max: 20, // максимум 20 поисковых запросов
  },
} as const;

export const VALIDATION_RULES = {
  PASSWORD: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  EMAIL: {
    maxLength: 254,
  },
  NAME: {
    minLength: 2,
    maxLength: 100,
  },
  DESCRIPTION: {
    maxLength: 1000,
  },
} as const;
