export declare enum ErrorCode {
    AUTH_INVALID_CREDENTIALS = "AUTH_1001",
    AUTH_TOKEN_EXPIRED = "AUTH_1002",
    AUTH_TOKEN_INVALID = "AUTH_1003",
    AUTH_USER_NOT_FOUND = "AUTH_1004",
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_1005",
    AUTH_ACCOUNT_LOCKED = "AUTH_1006",
    GRAPH_NODE_NOT_FOUND = "GRAPH_2001",
    GRAPH_EDGE_NOT_FOUND = "GRAPH_2002",
    GRAPH_INVALID_QUERY = "GRAPH_2003",
    GRAPH_CYCLIC_DEPENDENCY = "GRAPH_2004",
    GRAPH_DATA_CORRUPTED = "GRAPH_2005",
    SEARCH_QUERY_INVALID = "SEARCH_3001",
    SEARCH_INDEX_UNAVAILABLE = "SEARCH_3002",
    SEARCH_TIMEOUT = "SEARCH_3003",
    SEARCH_RESULTS_TOO_LARGE = "SEARCH_3004",
    JOB_NOT_FOUND = "JOB_4001",
    JOB_ALREADY_RUNNING = "JOB_4002",
    JOB_SCHEDULING_FAILED = "JOB_4003",
    JOB_EXECUTION_FAILED = "JOB_4004",
    JOB_TIMEOUT = "JOB_4005",
    SYSTEM_DATABASE_ERROR = "SYS_5001",
    SYSTEM_KAFKA_ERROR = "SYS_5002",
    SYSTEM_REDIS_ERROR = "SYS_5003",
    SYSTEM_NETWORK_ERROR = "SYS_5004",
    SYSTEM_RATE_LIMIT_EXCEEDED = "SYS_5005",
    SYSTEM_MAINTENANCE_MODE = "SYS_5006",
    VALIDATION_INVALID_INPUT = "VAL_6001",
    VALIDATION_MISSING_FIELD = "VAL_6002",
    VALIDATION_INVALID_FORMAT = "VAL_6003",
    VALIDATION_CONSTRAINT_VIOLATION = "VAL_6004",
    EXTERNAL_SERVICE_UNAVAILABLE = "EXT_7001",
    EXTERNAL_SERVICE_TIMEOUT = "EXT_7002",
    EXTERNAL_SERVICE_AUTH_FAILED = "EXT_7003",
    EXTERNAL_SERVICE_QUOTA_EXCEEDED = "EXT_7004"
}
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface StructuredError {
    code: ErrorCode;
    message: string;
    severity: ErrorSeverity;
    timestamp: number;
    correlationId?: string;
    userId?: string;
    service: string;
    context?: Record<string, unknown>;
    stack?: string;
    retryable: boolean;
    httpStatus: number;
}
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly severity: ErrorSeverity;
    readonly correlationId?: string;
    readonly userId?: string;
    readonly service: string;
    readonly context?: Record<string, unknown>;
    readonly retryable: boolean;
    readonly httpStatus: number;
    constructor(code: ErrorCode, message: string, severity: ErrorSeverity, service: string, options?: {
        correlationId?: string;
        userId?: string;
        context?: Record<string, unknown>;
        retryable?: boolean;
        httpStatus?: number;
    });
    toStructuredError(): StructuredError;
}
export * from './error-boundary';
export * from './retry-strategy';
export * from './standardized-errors';
export * from './error-recovery';
//# sourceMappingURL=index.d.ts.map