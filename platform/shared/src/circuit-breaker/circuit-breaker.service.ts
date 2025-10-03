import { injectable } from 'inversify';
import CircuitBreaker from 'opossum';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
  group?: string;
  volumeThreshold?: number;
  errorFilter?: (_error: Error) => boolean;
}

@injectable()
export class CircuitBreakerService extends BaseService {
  private readonly breakers: Map<string, CircuitBreaker> = new Map();

  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    super(logger, metrics);
  }

  createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ): CircuitBreaker {
    const name = options.name || 'default';
    const group = options.group || 'default';

    const breakerOptions = {
      timeout: options.timeout || 3000,
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      resetTimeout: options.resetTimeout || 30000,
      rollingCountTimeout: options.rollingCountTimeout || 10000,
      rollingCountBuckets: options.rollingCountBuckets || 10,
      volumeThreshold: options.volumeThreshold || 10,
      errorFilter: options.errorFilter || (() => true),
    };

    const breaker = new CircuitBreaker(operation, breakerOptions);

    // Event listeners
    breaker.on('success', (result: T) => {
      this.logger.debug(`Circuit breaker ${name} succeeded`, { result });
      this.metrics.incrementCounter(`circuit_breaker.${name}.success`);
    });

    breaker.on('failure', (error: Error) => {
      this.logger.warn(`Circuit breaker ${name} failed`, { error: error instanceof Error ? error.message : String(error) });
      this.metrics.incrementCounter(`circuit_breaker.${name}.failure`);
    });

    breaker.on('open', () => {
      this.logger.error(`Circuit breaker ${name} opened`, { group });
      this.metrics.incrementCounter(`circuit_breaker.${name}.open`);
    });

    breaker.on('halfOpen', () => {
      this.logger.info(`Circuit breaker ${name} half-opened`, { group });
      this.metrics.incrementCounter(`circuit_breaker.${name}.half_open`);
    });

    breaker.on('close', () => {
      this.logger.info(`Circuit breaker ${name} closed`, { group });
      this.metrics.incrementCounter(`circuit_breaker.${name}.close`);
    });

    // Store breaker
    this.breakers.set(name, breaker);

    return breaker;
  }

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ): Promise<T> {
    const name = options.name || 'default';
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = this.createCircuitBreaker(operation, options);
    }

    try {
      return await breaker.fire() as T;
    } catch (error) {
      this.logger.error(`Circuit breaker ${name} execution failed`, { error });
      throw error;
    }
  }

  getBreakerStatus(name: string): string | undefined {
    const breaker = this.breakers.get(name);
    return (breaker as { stats?: { state?: string } })?.stats?.state;
  }

  getAllBreakerStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {};
    for (const [name, breaker] of this.breakers) {
      statuses[name] = (breaker as unknown as { stats: { state: string } }).stats.state;
    }
    return statuses;
  }

  resetBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.halfOpen;
      this.logger.info(`Circuit breaker ${name} reset`);
    }
  }

  resetAllBreakers(): void {
    for (const [name, breaker] of this.breakers) {
      breaker.halfOpen;
      this.logger.info(`Circuit breaker ${name} reset`);
    }
  }

  getBreakerStats(name: string): unknown {
    const breaker = this.breakers.get(name);
    return breaker?.stats;
  }

  getAllBreakerStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.stats;
    }
    return stats;
  }
}
