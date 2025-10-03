import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

@injectable()
export class RetryService {
  private config: RetryConfig;

  constructor(
    private _logger: LoggerService,
    private _metrics: MetricsService
  ) {
    this.config = {
      maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
      baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000'),
      maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '10000'),
      backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
      jitter: process.env.RETRY_JITTER === 'true'
    };
    
    this._logger.info('RetryService initialized');
  }

  public async execute<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = { ...this.config, ...customConfig };
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        const totalTime = Date.now() - startTime;
        
        this._metrics.incrementCounter('retry_success_total', { 
          attempts: attempt.toString() 
        });
        
        this._logger.debug(`Operation succeeded on attempt ${attempt}`, {
          attempts: attempt,
          totalTime
        });
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime
        };
      } catch (error) {
        lastError = error as Error;
        
        this._metrics.incrementCounter('retry_attempt_total', { 
          attempt: attempt.toString() 
        });
        
        this._logger.warn(`Operation failed on attempt ${attempt}`, {
          error: lastError.message,
          attempt,
          maxAttempts: config.maxAttempts
        });
        
        if (attempt === config.maxAttempts) {
          const totalTime = Date.now() - startTime;
          
          this._metrics.incrementCounter('retry_failure_total', { 
            attempts: attempt.toString() 
          });
          
          this._logger.error(`Operation failed after ${attempt} attempts`, {
            error: lastError.message,
            attempts: attempt,
            totalTime
          });
          
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime
          };
        }
        
        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError ?? new Error('Unknown error'),
      attempts: config.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  public async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      ...customConfig,
      backoffMultiplier: customConfig?.backoffMultiplier || 2
    });
  }

  public async executeWithLinearBackoff<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      ...customConfig,
      backoffMultiplier: 1
    });
  }

  public async executeWithFixedDelay<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    return this.execute(operation, {
      ...customConfig,
      backoffMultiplier: 0
    });
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    if (delay > config.maxDelay) {
      delay = config.maxDelay;
    }
    
    if (config.jitter) {
      const jitterRange = delay * 0.1;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }
    
    return Math.max(0, delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getConfig(): RetryConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this._logger.info('Retry configuration updated', this.config);
  }
}
