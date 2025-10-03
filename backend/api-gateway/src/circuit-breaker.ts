import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
  monitoringPeriod: number;
  fallbackFunction?: () => Promise<unknown>;
  enableLogging?: boolean;
}

export interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  timeouts: number;
  lastFailureTime: number;
  state: CircuitState;
  totalRequests: number;
  failureRate: number;
  averageResponseTime: number;
  lastSuccessTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private timeouts: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private nextAttempt: number = 0;
  private totalRequests: number = 0;
  private responseTimes: number[] = [];

  constructor(
    private config: CircuitBreakerConfig,
    private name: string
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.logStateChange('OPEN', 'Circuit breaker is OPEN, using fallback');
        if (this.config.fallbackFunction) {
          return await this.config.fallbackFunction() as T;
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
      this.state = CircuitState.HALF_OPEN;
      this.logStateChange('HALF_OPEN', 'Attempting to close circuit breaker');
    }

    try {
      const result = await this.executeWithTimeout(operation);
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(responseTime, error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.timeouts++;
        reject(new Error(`Circuit breaker ${this.name} timeout`));
      }, this.config.timeout);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private onSuccess(responseTime: number): void {
    this.successes++;
    this.failures = 0;
    this.lastSuccessTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.logStateChange('CLOSED', 'Circuit breaker closed after successful operation');
    }
    
    if (this.config.enableLogging) {
      logger.info({
        circuitBreaker: this.name,
        state: this.state,
        responseTime,
        successes: this.successes,
        failures: this.failures
      }, 'Circuit breaker operation succeeded');
    }
  }

  private onFailure(responseTime: number, error: unknown): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      this.logStateChange('OPEN', `Circuit breaker opened after ${this.failures} failures`);
    }
    
    if (this.config.enableLogging) {
      logger.warn({
        circuitBreaker: this.name,
        state: this.state,
        responseTime,
        failures: this.failures,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Circuit breaker operation failed');
    }
  }

  private logStateChange(newState: string, message: string): void {
    if (this.config.enableLogging) {
      logger.info({
        circuitBreaker: this.name,
        previousState: this.state,
        newState,
        failures: this.failures,
        successes: this.successes
      }, message);
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
      : 0;
    
    const failureRate = this.totalRequests > 0 
      ? (this.failures / this.totalRequests) * 100 
      : 0;

    return {
      failures: this.failures,
      successes: this.successes,
      timeouts: this.timeouts,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state,
      totalRequests: this.totalRequests,
      failureRate,
      averageResponseTime
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.timeouts = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.nextAttempt = 0;
    this.totalRequests = 0;
    this.responseTimes = [];
    
    if (this.config.enableLogging) {
      logger.info({
        circuitBreaker: this.name
      }, 'Circuit breaker reset');
    }
  }
}

export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  createBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    const breaker = new CircuitBreaker(config, name);
    this.breakers.set(name, breaker);
    
    logger.info({
      circuitBreaker: name,
      config: {
        failureThreshold: config.failureThreshold,
        timeout: config.timeout,
        resetTimeout: config.resetTimeout
      }
    }, 'Circuit breaker created');
    
    return breaker;
  }

  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    
    logger.info({
      totalBreakers: this.breakers.size
    }, 'All circuit breakers reset');
  }

  startMonitoring(intervalMs: number = 60000): void {
    this.monitoringInterval = setInterval(() => {
      this.logMetrics();
    }, intervalMs);
    
    logger.info({
      intervalMs
    }, 'Circuit breaker monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      
      logger.info({}, 'Circuit breaker monitoring stopped');
    }
  }

  private logMetrics(): void {
    const metrics = this.getAllMetrics();
    
    logger.info({
      circuitBreakers: Object.keys(metrics).length,
      metrics: Object.entries(metrics).map(([name, metric]) => ({
        name,
        state: metric.state,
        failureRate: metric.failureRate,
        totalRequests: metric.totalRequests,
        averageResponseTime: metric.averageResponseTime
      }))
    }, 'Circuit breaker metrics report');
  }

  getHealthStatus(): Record<string, { healthy: boolean; reason?: string }> {
    const status: Record<string, { healthy: boolean; reason?: string }> = {};
    
    for (const [name, breaker] of this.breakers) {
      const metrics = breaker.getMetrics();
      const isHealthy = metrics.state === CircuitState.CLOSED || metrics.state === CircuitState.HALF_OPEN;
      
      status[name] = {
        healthy: isHealthy,
        reason: !isHealthy ? `Circuit breaker is ${metrics.state}` : undefined
      };
    }
    
    return status;
  }
}