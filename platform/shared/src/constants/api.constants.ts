export const API_CONSTANTS = {
  VERSION: '1.0.0',
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
  },
  
  HTTP_METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
  },
  
  CONTENT_TYPES: {
    JSON: 'application/json',
    XML: 'application/xml',
    FORM: 'application/x-www-form-urlencoded',
    MULTIPART: 'multipart/form-data',
    TEXT: 'text/plain',
    HTML: 'text/html',
    CSV: 'text/csv',
    PDF: 'application/pdf',
    IMAGE_JPEG: 'image/jpeg',
    IMAGE_PNG: 'image/png',
    IMAGE_GIF: 'image/gif',
    IMAGE_WEBP: 'image/webp'
  },
  
  HEADERS: {
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    USER_AGENT: 'User-Agent',
    X_REQUEST_ID: 'X-Request-ID',
    X_CORRELATION_ID: 'X-Correlation-ID',
    X_API_KEY: 'X-API-Key',
    X_RATE_LIMIT_LIMIT: 'X-RateLimit-Limit',
    X_RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',
    X_RATE_LIMIT_RESET: 'X-RateLimit-Reset',
    CACHE_CONTROL: 'Cache-Control',
    ETAG: 'ETag',
    IF_NONE_MATCH: 'If-None-Match',
    IF_MODIFIED_SINCE: 'If-Modified-Since',
    LAST_MODIFIED: 'Last-Modified'
  },
  
  AUTH_TYPES: {
    BEARER: 'Bearer',
    BASIC: 'Basic',
    API_KEY: 'ApiKey',
    OAUTH2: 'OAuth2'
  },
  
  RATE_LIMITS: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    MESSAGE: 'Too many requests, please try again later'
  },
  
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || '*',
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    ALLOWED_HEADERS: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Correlation-ID'
    ],
    CREDENTIALS: true,
    MAX_AGE: 86400 // 24 hours
  },
  
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1
  },
  
  SORT_ORDERS: {
    ASC: 'asc',
    DESC: 'desc'
  },
  
  FILTER_OPERATORS: {
    EQ: 'eq',
    NE: 'ne',
    GT: 'gt',
    GTE: 'gte',
    LT: 'lt',
    LTE: 'lte',
    LIKE: 'like',
    ILIKE: 'ilike',
    IN: 'in',
    NIN: 'nin',
    EXISTS: 'exists',
    RANGE: 'range'
  },
  
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    PHONE_REGEX: /^[+]?[1-9][\d]{0,15}$/,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 50,
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 100
  },
  
  CACHE: {
    DEFAULT_TTL: 3600, // 1 hour
    MAX_TTL: 86400, // 24 hours
    MIN_TTL: 60, // 1 minute
    TAGS: {
      USER: 'user',
      SESSION: 'session',
      API: 'api',
      CACHE: 'cache'
    }
  },
  
  LOGGING: {
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug',
      TRACE: 'trace'
    },
    FORMATS: {
      JSON: 'json',
      SIMPLE: 'simple',
      COMBINED: 'combined'
    }
  },
  
  METRICS: {
    PREFIX: 'science_map_',
    BUCKETS: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    COLLECT_DEFAULT: true,
    TIMEOUT: 5000
  },
  
  HEALTH: {
    TIMEOUT: 5000,
    INTERVAL: 30000,
    RETRIES: 3,
    THRESHOLD: 0.8
  },
  
  SECURITY: {
    JWT_EXPIRES_IN: '1h',
    REFRESH_EXPIRES_IN: '7d',
    BCRYPT_ROUNDS: 12,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    PASSWORD_HISTORY: 5,
    TOKEN_LENGTH: 32,
    SALT_LENGTH: 16
  }
} as const;

export type ApiConstants = typeof API_CONSTANTS;
