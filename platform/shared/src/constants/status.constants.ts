export const STATUS_CONSTANTS = {
  HTTP: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    PERMANENT_REDIRECT: 308,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    IM_A_TEAPOT: 418,
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511
  },
  
  SERVICE: {
    HEALTHY: 'healthy',
    UNHEALTHY: 'unhealthy',
    DEGRADED: 'degraded',
    STARTING: 'starting',
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    DEBUG: 'debug'
  },
  
  JOB: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DELAYED: 'delayed',
    PAUSED: 'paused',
    STUCK: 'stuck',
    CANCELLED: 'cancelled',
    RETRYING: 'retrying'
  },
  
  USER: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    BANNED: 'banned',
    DELETED: 'deleted',
    VERIFIED: 'verified',
    UNVERIFIED: 'unverified'
  },
  
  SESSION: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
    INVALID: 'invalid',
    PENDING: 'pending'
  },
  
  TRANSACTION: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    ROLLED_BACK: 'rolled_back',
    TIMEOUT: 'timeout'
  },
  
  CACHE: {
    HIT: 'hit',
    MISS: 'miss',
    EXPIRED: 'expired',
    INVALID: 'invalid',
    ERROR: 'error'
  },
  
  DATABASE: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    ERROR: 'error',
    MAINTENANCE: 'maintenance',
    READ_ONLY: 'read_only'
  },
  
  QUEUE: {
    EMPTY: 'empty',
    PROCESSING: 'processing',
    FULL: 'full',
    ERROR: 'error',
    PAUSED: 'paused',
    DRAINING: 'draining'
  },
  
  API: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    DEBUG: 'debug'
  },
  
  LOG: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    TRACE: 'trace',
    FATAL: 'fatal'
  },
  
  METRIC: {
    COUNTER: 'counter',
    GAUGE: 'gauge',
    HISTOGRAM: 'histogram',
    SUMMARY: 'summary',
    INFO: 'info'
  },
  
  ALERT: {
    FIRING: 'firing',
    RESOLVED: 'resolved',
    PENDING: 'pending',
    SUPPRESSED: 'suppressed',
    SILENCED: 'silenced'
  },
  
  DEPLOYMENT: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    SUCCESS: 'success',
    FAILED: 'failed',
    ROLLED_BACK: 'rolled_back',
    CANCELLED: 'cancelled'
  },
  
  BUILD: {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    SKIPPED: 'skipped'
  },
  
  TEST: {
    PENDING: 'pending',
    RUNNING: 'running',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    ERROR: 'error'
  },
  
  SECURITY: {
    SAFE: 'safe',
    WARNING: 'warning',
    CRITICAL: 'critical',
    VULNERABLE: 'vulnerable',
    SECURE: 'secure'
  },
  
  PERFORMANCE: {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    FAIR: 'fair',
    POOR: 'poor',
    CRITICAL: 'critical'
  },
  
  AVAILABILITY: {
    UP: 'up',
    DOWN: 'down',
    DEGRADED: 'degraded',
    MAINTENANCE: 'maintenance',
    UNKNOWN: 'unknown'
  }
} as const;

export type StatusConstants = typeof STATUS_CONSTANTS;
