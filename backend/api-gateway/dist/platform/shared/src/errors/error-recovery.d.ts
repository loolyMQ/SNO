import pino from 'pino';
export interface FallbackStrategy {
    type: 'default' | 'cached' | 'alternative' | 'degraded';
    value?: unknown;
    message?: string;
    timeout?: number;
}
export interface ErrorRecoveryConfig {
    maxRetries: number;
    retryDelay: number;
    fallbackStrategy: FallbackStrategy;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    enableFallback: boolean;
    enableCircuitBreaker: boolean;
}
export declare class ErrorRecoveryManager {
    private config;
    private static readonly DEFAULT_CONFIG;
    private circuitBreakerStates;
    private logger;
    constructor(config?: Partial<ErrorRecoveryConfig>, logger?: pino.Logger);
    static create(config?: Partial<ErrorRecoveryConfig>, logger?: pino.Logger): ErrorRecoveryManager;
    executeWithRecovery<T>(operation: () => Promise<T>, operationName: string, correlationId?: string, fallbackValue?: T): Promise<T>;
    executeWithFallback<T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>, operationName: string, correlationId?: string): Promise<T>;
    executeWithCachedFallback<T>(operation: () => Promise<T>, cacheKey: string, cacheGet: (key: string) => Promise<T | null>, cacheSet: (key: string, value: T, ttl?: number) => Promise<void>, operationName: string, correlationId?: string, cacheTTL?: number): Promise<T>;
    executeWithDegradedService<T>(operation: () => Promise<T>, degradedOperation: () => Promise<T>, operationName: string, correlationId?: string): Promise<T>;
    executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number, operationName: string, correlationId?: string, fallbackValue?: T): Promise<T>;
    private executeFallback;
    private isCircuitBreakerOpen;
    private recordFailure;
    private resetCircuitBreaker;
    private getCircuitBreakerFailures;
    getCircuitBreakerState(key: string): 'closed' | 'open' | 'half-open' | 'unknown';
    resetAllCircuitBreakers(): void;
    getCircuitBreakerStats(): Record<string, {
        failures: number;
        state: string;
        lastFailure: number;
    }>;
}
//# sourceMappingURL=error-recovery.d.ts.map