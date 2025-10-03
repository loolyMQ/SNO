import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

@injectable()
export abstract class BaseService {
  protected readonly logger: LoggerService;
  protected readonly metrics: MetricsService;

  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    this.logger = logger;
    this.metrics = metrics;
  }

  protected async executeWithMetrics<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Starting ${operation}`);
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.metrics.incrementCounter(`${operation}.success`);
      this.metrics.recordHistogram(`${operation}.duration`, duration);
      this.logger.info(`Completed ${operation} in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.metrics.incrementCounter(`${operation}.error`);
      this.metrics.recordHistogram(`${operation}.duration`, duration);
      this.logger.error(`Failed ${operation} in ${duration}ms`, { error });
      
      throw error;
    }
  }

  protected async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    if (!operation) {
      throw new Error('Operation name is required');
    }
    if (!fn) {
      throw new Error('Function is required');
    }
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWithMetrics(operation, fn);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          this.logger.error(`Operation ${operation} failed after ${maxRetries} attempts`, { error: lastError });
          throw lastError;
        }
        
        this.logger.warn(`Operation ${operation} failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, { error });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    
    throw lastError!;
  }
}
