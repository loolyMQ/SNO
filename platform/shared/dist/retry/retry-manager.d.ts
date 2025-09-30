export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
    retryableErrors: string[];
}
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalTime: number;
}
export declare class RetryManager {
    private static readonly DEFAULT_CONFIG;
    static executeWithRetry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>, service?: string): Promise<T>;
    static executeWithRetryAndResult<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>, service?: string): Promise<RetryResult<T>>;
    static createRetryConfig(overrides?: Partial<RetryConfig>): RetryConfig;
    static createFastRetryConfig(): RetryConfig;
    static createSlowRetryConfig(): RetryConfig;
    static createNetworkRetryConfig(): RetryConfig;
    static createDatabaseRetryConfig(): RetryConfig;
    private static shouldRetry;
    private static calculateDelay;
    private static sleep;
    private static wrapRetryError;
}
//# sourceMappingURL=retry-manager.d.ts.map