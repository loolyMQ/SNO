import { AppError, ErrorCode, ErrorSeverity } from '../errors';
export class RetryManager {
    static DEFAULT_CONFIG = {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: [
            'timeout',
            'connection',
            'network',
            'temporary',
            'unavailable',
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ENETUNREACH',
        ],
    };
    static async executeWithRetry(operation, config = {}, service = 'unknown') {
        const finalConfig = { ...RetryManager.DEFAULT_CONFIG, ...config };
        let lastError;
        const startTime = Date.now();
        for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
            try {
                const result = await operation();
                return result;
            }
            catch (error) {
                lastError = error;
                if (!RetryManager.shouldRetry(error, attempt, finalConfig)) {
                    throw RetryManager.wrapRetryError(error, service, attempt, Date.now() - startTime);
                }
                if (attempt < finalConfig.maxAttempts) {
                    const delay = RetryManager.calculateDelay(attempt, finalConfig);
                    await RetryManager.sleep(delay);
                }
            }
        }
        throw RetryManager.wrapRetryError(lastError, service, finalConfig.maxAttempts, Date.now() - startTime);
    }
    static async executeWithRetryAndResult(operation, config = {}, service = 'unknown') {
        const finalConfig = { ...RetryManager.DEFAULT_CONFIG, ...config };
        let lastError;
        const startTime = Date.now();
        for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
            try {
                const result = await operation();
                return {
                    success: true,
                    result,
                    attempts: attempt,
                    totalTime: Date.now() - startTime,
                };
            }
            catch (error) {
                lastError = error;
                if (!RetryManager.shouldRetry(error, attempt, finalConfig)) {
                    return {
                        success: false,
                        error: RetryManager.wrapRetryError(error, service, attempt, Date.now() - startTime),
                        attempts: attempt,
                        totalTime: Date.now() - startTime,
                    };
                }
                if (attempt < finalConfig.maxAttempts) {
                    const delay = RetryManager.calculateDelay(attempt, finalConfig);
                    await RetryManager.sleep(delay);
                }
            }
        }
        return {
            success: false,
            error: RetryManager.wrapRetryError(lastError, service, finalConfig.maxAttempts, Date.now() - startTime),
            attempts: finalConfig.maxAttempts,
            totalTime: Date.now() - startTime,
        };
    }
    static createRetryConfig(overrides = {}) {
        return { ...RetryManager.DEFAULT_CONFIG, ...overrides };
    }
    static createFastRetryConfig() {
        return {
            maxAttempts: 2,
            baseDelay: 100,
            maxDelay: 1000,
            backoffMultiplier: 2,
            jitter: true,
            retryableErrors: RetryManager.DEFAULT_CONFIG.retryableErrors,
        };
    }
    static createSlowRetryConfig() {
        return {
            maxAttempts: 5,
            baseDelay: 2000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitter: true,
            retryableErrors: RetryManager.DEFAULT_CONFIG.retryableErrors,
        };
    }
    static createNetworkRetryConfig() {
        return {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true,
            retryableErrors: [
                'ECONNRESET',
                'ENOTFOUND',
                'ETIMEDOUT',
                'ECONNREFUSED',
                'ENETUNREACH',
                'timeout',
                'connection',
                'network',
            ],
        };
    }
    static createDatabaseRetryConfig() {
        return {
            maxAttempts: 3,
            baseDelay: 500,
            maxDelay: 5000,
            backoffMultiplier: 2,
            jitter: true,
            retryableErrors: [
                'connection',
                'timeout',
                'ECONNRESET',
                'ETIMEDOUT',
                'temporary',
                'unavailable',
            ],
        };
    }
    static shouldRetry(error, attempt, config) {
        if (attempt >= config.maxAttempts) {
            return false;
        }
        if (error instanceof AppError) {
            return error.retryable;
        }
        const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
        return config.retryableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()));
    }
    static calculateDelay(attempt, config) {
        let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        delay = Math.min(delay, config.maxDelay);
        if (config.jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }
        return Math.floor(delay);
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static wrapRetryError(error, service, attempts, totalTime) {
        return new AppError(ErrorCode.SYSTEM_NETWORK_ERROR, `Operation failed after ${attempts} attempts in ${totalTime}ms: ${error instanceof Error ? error.message : String(error)}`, ErrorSeverity.HIGH, service, {
            retryable: false,
            httpStatus: 503,
            context: {
                originalError: error instanceof Error ? error.message : String(error),
                attempts,
                totalTime,
                service,
            },
        });
    }
}
//# sourceMappingURL=retry-manager.js.map