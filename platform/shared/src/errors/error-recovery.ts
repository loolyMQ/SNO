import { RetryManager } from '../retry';
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

export class ErrorRecoveryManager {
  private static readonly DEFAULT_CONFIG: ErrorRecoveryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackStrategy: { type: 'default' },
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    enableFallback: true,
    enableCircuitBreaker: true,
  };

  private circuitBreakerStates = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  private logger: pino.Logger;

  constructor(
    private config: Partial<ErrorRecoveryConfig> = {},
    logger?: pino.Logger
  ) {
    this.config = { ...ErrorRecoveryManager.DEFAULT_CONFIG, ...config };
    this.logger = logger || pino();
  }

  static create(
    config: Partial<ErrorRecoveryConfig> = {},
    logger?: pino.Logger
  ): ErrorRecoveryManager {
    return new ErrorRecoveryManager(config, logger);
  }

  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    correlationId?: string,
    fallbackValue?: T
  ): Promise<T> {
    const circuitBreakerKey = operationName;

    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      this.logger.warn(
        {
          operation: operationName,
          correlationId,
          circuitBreakerState: 'open',
        },
        'Circuit breaker is open, using fallback'
      );

      return this.executeFallback(fallbackValue, operationName, correlationId);
    }

    try {
      const result = await RetryManager.executeWithRetry(
        operation,
        {
          maxAttempts: this.config.maxRetries!,
          baseDelay: this.config.retryDelay!,
        },
        operationName
      );

      this.resetCircuitBreaker(circuitBreakerKey);
      return result;
    } catch (error) {
      this.recordFailure(circuitBreakerKey);

      this.logger.error(
        {
          operation: operationName,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
          circuitBreakerFailures: this.getCircuitBreakerFailures(circuitBreakerKey),
        },
        'Operation failed, attempting recovery'
      );

      if (this.config.enableFallback) {
        return this.executeFallback(fallbackValue, operationName, correlationId);
      }

      throw error;
    }
  }

  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string,
    correlationId?: string
  ): Promise<T> {
    try {
      return await RetryManager.executeWithRetry(
        operation,
        {
          maxAttempts: this.config.maxRetries!,
          baseDelay: this.config.retryDelay!,
        },
        operationName
      );
    } catch (error) {
      this.logger.warn(
        {
          operation: operationName,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Primary operation failed, using fallback'
      );

      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        this.logger.error(
          {
            operation: operationName,
            correlationId,
            primaryError: error instanceof Error ? error.message : String(error),
            fallbackError:
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          },
          'Both primary and fallback operations failed'
        );

        throw fallbackError;
      }
    }
  }

  async executeWithCachedFallback<T>(
    operation: () => Promise<T>,
    cacheKey: string,
    cacheGet: (key: string) => Promise<T | null>,
    cacheSet: (key: string, value: T, ttl?: number) => Promise<void>,
    operationName: string,
    correlationId?: string,
    cacheTTL: number = 300000
  ): Promise<T> {
    try {
      const result = await RetryManager.executeWithRetry(
        operation,
        {
          maxAttempts: this.config.maxRetries!,
          baseDelay: this.config.retryDelay!,
        },
        operationName
      );

      await cacheSet(cacheKey, result, cacheTTL);
      return result;
    } catch (error) {
      this.logger.warn(
        {
          operation: operationName,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Operation failed, attempting to use cached value'
      );

      const cachedValue = await cacheGet(cacheKey);
      if (cachedValue !== null) {
        this.logger.info(
          {
            operation: operationName,
            correlationId,
            cacheKey,
          },
          'Using cached value as fallback'
        );

        return cachedValue;
      }

      throw error;
    }
  }

  async executeWithDegradedService<T>(
    operation: () => Promise<T>,
    degradedOperation: () => Promise<T>,
    operationName: string,
    correlationId?: string
  ): Promise<T> {
    try {
      return await RetryManager.executeWithRetry(
        operation,
        {
          maxAttempts: this.config.maxRetries!,
          baseDelay: this.config.retryDelay!,
        },
        operationName
      );
    } catch (error) {
      this.logger.warn(
        {
          operation: operationName,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        },
        'Primary operation failed, using degraded service'
      );

      return await degradedOperation();
    }
  }

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    correlationId?: string,
    fallbackValue?: T
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      this.logger.error(
        {
          operation: operationName,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
          timeout: timeoutMs,
        },
        'Operation timed out, using fallback'
      );

      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      throw error;
    }
  }

  private executeFallback<T>(
    fallbackValue: T | undefined,
    operationName: string,
    correlationId?: string
  ): T {
    const strategy = this.config.fallbackStrategy!;

    this.logger.info(
      {
        operation: operationName,
        correlationId,
        fallbackStrategy: strategy.type,
      },
      'Executing fallback strategy'
    );

    switch (strategy.type) {
      case 'default':
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        throw new Error(`No fallback value provided for ${operationName}`);

      case 'cached':
        throw new Error(`Cached fallback not implemented for ${operationName}`);

      case 'alternative':
        throw new Error(`Alternative fallback not implemented for ${operationName}`);

      case 'degraded':
        throw new Error(`Degraded service fallback not implemented for ${operationName}`);

      default:
        throw new Error(`Unknown fallback strategy: ${strategy.type}`);
    }
  }

  private isCircuitBreakerOpen(key: string): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }

    const state = this.circuitBreakerStates.get(key);
    if (!state) {
      return false;
    }

    if (state.state === 'open') {
      const now = Date.now();
      if (now - state.lastFailure > this.config.circuitBreakerTimeout!) {
        state.state = 'half-open';
        this.circuitBreakerStates.set(key, state);
        return false;
      }
      return true;
    }

    return false;
  }

  private recordFailure(key: string): void {
    if (!this.config.enableCircuitBreaker) {
      return;
    }

    const state = this.circuitBreakerStates.get(key) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
    };

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreakerThreshold!) {
      state.state = 'open';
    }

    this.circuitBreakerStates.set(key, state);
  }

  private resetCircuitBreaker(key: string): void {
    const state = this.circuitBreakerStates.get(key);
    if (state) {
      state.failures = 0;
      state.state = 'closed';
      this.circuitBreakerStates.set(key, state);
    }
  }

  private getCircuitBreakerFailures(key: string): number {
    const state = this.circuitBreakerStates.get(key);
    return state?.failures || 0;
  }

  getCircuitBreakerState(key: string): 'closed' | 'open' | 'half-open' | 'unknown' {
    const state = this.circuitBreakerStates.get(key);
    return state?.state || 'unknown';
  }

  resetAllCircuitBreakers(): void {
    this.circuitBreakerStates.clear();
    this.logger.info('All circuit breakers reset');
  }

  getCircuitBreakerStats(): Record<
    string,
    {
      failures: number;
      state: string;
      lastFailure: number;
    }
  > {
    const stats: Record<string, any> = {};

    for (const [key, state] of this.circuitBreakerStates) {
      stats[key] = {
        failures: state.failures,
        state: state.state,
        lastFailure: state.lastFailure,
      };
    }

    return stats;
  }
}
