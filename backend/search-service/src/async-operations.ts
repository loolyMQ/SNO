import { promisify } from 'util';
import { readFile, writeFile, stat } from 'fs';

// Promisify file system operations
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);

export class AsyncIOOperations {
  private static instance: AsyncIOOperations;
  private operationQueue: Array<() => Promise<unknown>> = [];
  private isProcessing = false;
  private maxConcurrency = 10;
  private activeOperations = 0;

  private constructor() {}

  static getInstance(): AsyncIOOperations {
    if (!AsyncIOOperations.instance) {
      AsyncIOOperations.instance = new AsyncIOOperations();
    }
    return AsyncIOOperations.instance;
  }

  // Async file operations
  async readFileAsync(filePath: string): Promise<Buffer> {
    return this.executeAsync(() => readFileAsync(filePath));
  }

  async writeFileAsync(filePath: string, data: string | Buffer): Promise<void> {
    return this.executeAsync(() => writeFileAsync(filePath, data));
  }

  async statAsync(filePath: string): Promise<unknown> {
    return this.executeAsync(() => statAsync(filePath));
  }

  // Async database operations
  async executeQuery<T>(queryFn: () => Promise<T>): Promise<T> {
    return this.executeAsync(queryFn);
  }

  async executeTransaction<T>(transactionFn: () => Promise<T>): Promise<T> {
    return this.executeAsync(transactionFn);
  }

  // Async HTTP operations
  async fetchAsync(url: string, options?: RequestInit): Promise<Response> {
    return this.executeAsync(async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    });
  }

  // Async cache operations
  async cacheOperation<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeAsync(async () => {
      // This would integrate with actual cache service
      return await operation();
    });
  }

  // Batch operations
  async executeBatch<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const promises = operations.map(op => this.executeAsync(op));
    return Promise.all(promises);
  }

  // Parallel operations with concurrency control
  async executeParallel<T>(
    operations: Array<() => Promise<T>>,
    concurrency: number = this.maxConcurrency
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const operation of operations) {
      const promise = this.executeAsync(operation).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  // Retry mechanism for failed operations
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeAsync(operation);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await this.delay(delay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  // Circuit breaker pattern
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute

  async executeWithCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    if (this.circuitBreakerState === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.circuitBreakerState = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await this.executeAsync(operation);
      
      if (this.circuitBreakerState === 'half-open') {
        this.circuitBreakerState = 'closed';
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.circuitBreakerState = 'open';
      }
      
      throw error;
    }
  }

  // Core async execution with concurrency control
  private async executeAsync<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        try {
          this.activeOperations++;
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeOperations--;
          // Process queue asynchronously to avoid recursion
          setImmediate(() => this.processQueue());
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeOperations >= this.maxConcurrency) {
      return;
    }

    this.isProcessing = true;

    while (this.operationQueue.length > 0 && this.activeOperations < this.maxConcurrency) {
      const operation = this.operationQueue.shift();
      if (operation) {
        operation().catch(() => {
          // Async operation failed
        });
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Metrics
  getMetrics() {
    return {
      queueLength: this.operationQueue.length,
      activeOperations: this.activeOperations,
      maxConcurrency: this.maxConcurrency,
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
    };
  }
}

// Global instance
export const asyncIO = AsyncIOOperations.getInstance();
