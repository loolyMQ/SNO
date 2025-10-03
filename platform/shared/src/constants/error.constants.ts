export const ERROR_CONSTANTS = {
  CODES: {
    // General errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',
    NETWORK_ERROR: 'NETWORK_ERROR',
    
    // Database errors
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    QUERY_ERROR: 'QUERY_ERROR',
    TRANSACTION_ERROR: 'TRANSACTION_ERROR',
    CONSTRAINT_ERROR: 'CONSTRAINT_ERROR',
    DUPLICATE_KEY: 'DUPLICATE_KEY',
    FOREIGN_KEY_ERROR: 'FOREIGN_KEY_ERROR',
    
    // Cache errors
    CACHE_ERROR: 'CACHE_ERROR',
    CACHE_MISS: 'CACHE_MISS',
    CACHE_TIMEOUT: 'CACHE_TIMEOUT',
    CACHE_CONNECTION_ERROR: 'CACHE_CONNECTION_ERROR',
    
    // File system errors
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    FILE_READ_ERROR: 'FILE_READ_ERROR',
    FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
    FILE_PERMISSION_ERROR: 'FILE_PERMISSION_ERROR',
    FILE_SIZE_ERROR: 'FILE_SIZE_ERROR',
    FILE_TYPE_ERROR: 'FILE_TYPE_ERROR',
    
    // External service errors
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    API_ERROR: 'API_ERROR',
    WEBHOOK_ERROR: 'WEBHOOK_ERROR',
    INTEGRATION_ERROR: 'INTEGRATION_ERROR',
    
    // Business logic errors
    BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
    WORKFLOW_ERROR: 'WORKFLOW_ERROR',
    STATE_ERROR: 'STATE_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    
    // Configuration errors
    CONFIG_ERROR: 'CONFIG_ERROR',
    ENVIRONMENT_ERROR: 'ENVIRONMENT_ERROR',
    DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
    INITIALIZATION_ERROR: 'INITIALIZATION_ERROR'
  },
  
  MESSAGES: {
    // General messages
    INTERNAL_ERROR: 'An internal error occurred',
    VALIDATION_ERROR: 'Validation failed',
    AUTHENTICATION_ERROR: 'Authentication failed',
    AUTHORIZATION_ERROR: 'Access denied',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource conflict',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    SERVICE_UNAVAILABLE: 'Service unavailable',
    TIMEOUT: 'Request timeout',
    NETWORK_ERROR: 'Network error',
    
    // Database messages
    DATABASE_ERROR: 'Database error occurred',
    CONNECTION_ERROR: 'Database connection failed',
    QUERY_ERROR: 'Database query failed',
    TRANSACTION_ERROR: 'Database transaction failed',
    CONSTRAINT_ERROR: 'Database constraint violation',
    DUPLICATE_KEY: 'Duplicate key error',
    FOREIGN_KEY_ERROR: 'Foreign key constraint violation',
    
    // Cache messages
    CACHE_ERROR: 'Cache error occurred',
    CACHE_MISS: 'Cache miss',
    CACHE_TIMEOUT: 'Cache timeout',
    CACHE_CONNECTION_ERROR: 'Cache connection failed',
    
    // File system messages
    FILE_NOT_FOUND: 'File not found',
    FILE_READ_ERROR: 'File read error',
    FILE_WRITE_ERROR: 'File write error',
    FILE_PERMISSION_ERROR: 'File permission denied',
    FILE_SIZE_ERROR: 'File size exceeds limit',
    FILE_TYPE_ERROR: 'Invalid file type',
    
    // External service messages
    EXTERNAL_SERVICE_ERROR: 'External service error',
    API_ERROR: 'API error occurred',
    WEBHOOK_ERROR: 'Webhook error',
    INTEGRATION_ERROR: 'Integration error',
    
    // Business logic messages
    BUSINESS_RULE_ERROR: 'Business rule violation',
    WORKFLOW_ERROR: 'Workflow error',
    STATE_ERROR: 'Invalid state',
    PERMISSION_ERROR: 'Permission denied',
    QUOTA_EXCEEDED: 'Quota exceeded',
    
    // Configuration messages
    CONFIG_ERROR: 'Configuration error',
    ENVIRONMENT_ERROR: 'Environment error',
    DEPENDENCY_ERROR: 'Dependency error',
    INITIALIZATION_ERROR: 'Initialization failed'
  },
  
  HTTP_STATUS: {
    INTERNAL_ERROR: 500,
    VALIDATION_ERROR: 400,
    AUTHENTICATION_ERROR: 401,
    AUTHORIZATION_ERROR: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMIT_EXCEEDED: 429,
    SERVICE_UNAVAILABLE: 503,
    TIMEOUT: 504,
    NETWORK_ERROR: 502,
    DATABASE_ERROR: 500,
    CONNECTION_ERROR: 503,
    QUERY_ERROR: 500,
    TRANSACTION_ERROR: 500,
    CONSTRAINT_ERROR: 400,
    DUPLICATE_KEY: 409,
    FOREIGN_KEY_ERROR: 400,
    CACHE_ERROR: 500,
    CACHE_MISS: 404,
    CACHE_TIMEOUT: 504,
    CACHE_CONNECTION_ERROR: 503,
    FILE_NOT_FOUND: 404,
    FILE_READ_ERROR: 500,
    FILE_WRITE_ERROR: 500,
    FILE_PERMISSION_ERROR: 403,
    FILE_SIZE_ERROR: 413,
    FILE_TYPE_ERROR: 400,
    EXTERNAL_SERVICE_ERROR: 502,
    API_ERROR: 502,
    WEBHOOK_ERROR: 500,
    INTEGRATION_ERROR: 502,
    BUSINESS_RULE_ERROR: 400,
    WORKFLOW_ERROR: 400,
    STATE_ERROR: 400,
    PERMISSION_ERROR: 403,
    QUOTA_EXCEEDED: 429,
    CONFIG_ERROR: 500,
    ENVIRONMENT_ERROR: 500,
    DEPENDENCY_ERROR: 500,
    INITIALIZATION_ERROR: 500
  },
  
  SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },
  
  CATEGORIES: {
    SYSTEM: 'system',
    APPLICATION: 'application',
    DATABASE: 'database',
    NETWORK: 'network',
    SECURITY: 'security',
    BUSINESS: 'business',
    CONFIGURATION: 'configuration',
    EXTERNAL: 'external'
  },
  
  RETRY_POLICIES: {
    NONE: 'none',
    IMMEDIATE: 'immediate',
    EXPONENTIAL: 'exponential',
    LINEAR: 'linear',
    CUSTOM: 'custom'
  },
  
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },
  
  ALERT_THRESHOLDS: {
    ERROR_RATE: 0.1, // 10%
    RESPONSE_TIME: 5000, // 5 seconds
    MEMORY_USAGE: 0.8, // 80%
    CPU_USAGE: 0.8, // 80%
    DISK_USAGE: 0.9 // 90%
  },
  
  RECOVERY_ACTIONS: {
    RETRY: 'retry',
    FALLBACK: 'fallback',
    CIRCUIT_BREAKER: 'circuit_breaker',
    ALERT: 'alert',
    RESTART: 'restart',
    MANUAL: 'manual'
  }
} as const;

export type ErrorConstants = typeof ERROR_CONSTANTS;
