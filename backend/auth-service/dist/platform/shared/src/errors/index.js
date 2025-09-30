export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTH_INVALID_CREDENTIALS"] = "AUTH_1001";
    ErrorCode["AUTH_TOKEN_EXPIRED"] = "AUTH_1002";
    ErrorCode["AUTH_TOKEN_INVALID"] = "AUTH_1003";
    ErrorCode["AUTH_USER_NOT_FOUND"] = "AUTH_1004";
    ErrorCode["AUTH_INSUFFICIENT_PERMISSIONS"] = "AUTH_1005";
    ErrorCode["AUTH_ACCOUNT_LOCKED"] = "AUTH_1006";
    ErrorCode["GRAPH_NODE_NOT_FOUND"] = "GRAPH_2001";
    ErrorCode["GRAPH_EDGE_NOT_FOUND"] = "GRAPH_2002";
    ErrorCode["GRAPH_INVALID_QUERY"] = "GRAPH_2003";
    ErrorCode["GRAPH_CYCLIC_DEPENDENCY"] = "GRAPH_2004";
    ErrorCode["GRAPH_DATA_CORRUPTED"] = "GRAPH_2005";
    ErrorCode["SEARCH_QUERY_INVALID"] = "SEARCH_3001";
    ErrorCode["SEARCH_INDEX_UNAVAILABLE"] = "SEARCH_3002";
    ErrorCode["SEARCH_TIMEOUT"] = "SEARCH_3003";
    ErrorCode["SEARCH_RESULTS_TOO_LARGE"] = "SEARCH_3004";
    ErrorCode["JOB_NOT_FOUND"] = "JOB_4001";
    ErrorCode["JOB_ALREADY_RUNNING"] = "JOB_4002";
    ErrorCode["JOB_SCHEDULING_FAILED"] = "JOB_4003";
    ErrorCode["JOB_EXECUTION_FAILED"] = "JOB_4004";
    ErrorCode["JOB_TIMEOUT"] = "JOB_4005";
    ErrorCode["SYSTEM_DATABASE_ERROR"] = "SYS_5001";
    ErrorCode["SYSTEM_KAFKA_ERROR"] = "SYS_5002";
    ErrorCode["SYSTEM_REDIS_ERROR"] = "SYS_5003";
    ErrorCode["SYSTEM_NETWORK_ERROR"] = "SYS_5004";
    ErrorCode["SYSTEM_RATE_LIMIT_EXCEEDED"] = "SYS_5005";
    ErrorCode["SYSTEM_MAINTENANCE_MODE"] = "SYS_5006";
    ErrorCode["VALIDATION_INVALID_INPUT"] = "VAL_6001";
    ErrorCode["VALIDATION_MISSING_FIELD"] = "VAL_6002";
    ErrorCode["VALIDATION_INVALID_FORMAT"] = "VAL_6003";
    ErrorCode["VALIDATION_CONSTRAINT_VIOLATION"] = "VAL_6004";
    ErrorCode["EXTERNAL_SERVICE_UNAVAILABLE"] = "EXT_7001";
    ErrorCode["EXTERNAL_SERVICE_TIMEOUT"] = "EXT_7002";
    ErrorCode["EXTERNAL_SERVICE_AUTH_FAILED"] = "EXT_7003";
    ErrorCode["EXTERNAL_SERVICE_QUOTA_EXCEEDED"] = "EXT_7004";
})(ErrorCode || (ErrorCode = {}));
export var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (ErrorSeverity = {}));
export class AppError extends Error {
    code;
    severity;
    correlationId;
    userId;
    service;
    context;
    retryable;
    httpStatus;
    constructor(code, message, severity, service, options = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.severity = severity;
        this.service = service;
        this.correlationId = options.correlationId || '';
        this.userId = options.userId || '';
        this.context = options.context || {};
        this.retryable = options.retryable ?? false;
        this.httpStatus = options.httpStatus ?? 500;
    }
    toStructuredError() {
        return {
            code: this.code,
            message: this.message,
            severity: this.severity,
            timestamp: Date.now(),
            correlationId: this.correlationId || '',
            userId: this.userId || '',
            service: this.service,
            context: this.context || {},
            stack: this.stack || '',
            retryable: this.retryable,
            httpStatus: this.httpStatus,
        };
    }
}
export * from './error-boundary';
export * from './retry-strategy';
export * from './standardized-errors';
export * from './error-recovery';
//# sourceMappingURL=index.js.map