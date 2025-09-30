import Redis from 'ioredis';
import pino from 'pino';
import { IConnectionPool, IConnectionPoolConfig, IPoolStats } from './interfaces';
import {
  poolConnectionsTotal,
  poolConnectionsActive,
  poolConnectionsIdle,
  poolOperationsTotal,
  poolConnectionDuration,
} from './metrics';

export class RedisConnectionPool implements IConnectionPool<Redis> {
  private connections: Redis[] = [];
  private availableConnections: Redis[] = [];
  private borrowedConnections: Set<Redis> = new Set();
  private config: IConnectionPoolConfig;
  private redisConfig: Record<string, unknown>;
  private logger: pino.Logger;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(
    config: IConnectionPoolConfig,
    redisConfig: Record<string, unknown>,
    logger?: pino.Logger
  ) {
    this.config = config;
    this.redisConfig = redisConfig;
    this.logger = logger || pino();

    this.initialize();
    this.startHealthCheck();
  }

  private async initialize(): Promise<void> {
    for (let i = 0; i < this.config.min; i++) {
      const connection = await this.createConnection();
      this.availableConnections.push(connection);
    }
    this.updateMetrics();
  }

  private async createConnection(): Promise<Redis> {
    const connection = new Redis({
      ...this.redisConfig,
      lazyConnect: true,
      maxRetriesPerRequest: this.config.maxRetries,
      connectTimeout: this.config.createTimeoutMillis,
      // retryDelayOnFailover: this.config.createRetryIntervalMillis // Not a valid ioredis option
    });

    await connection.connect();
    this.connections.push(connection);

    connection.on('error', err => {
      this.logger.error(`Redis connection error: ${this.config.name}`, err);
      poolOperationsTotal.inc({
        pool_type: 'redis',
        pool_name: this.config.name,
        operation: 'error',
        status: 'error',
      });
    });

    poolOperationsTotal.inc({
      pool_type: 'redis',
      pool_name: this.config.name,
      operation: 'create',
      status: 'success',
    });

    return connection;
  }

  async acquire(): Promise<Redis> {
    const start = Date.now();

    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;
      this.borrowedConnections.add(connection);

      poolOperationsTotal.inc({
        pool_type: 'redis',
        pool_name: this.config.name,
        operation: 'acquire',
        status: 'success',
      });

      this.updateMetrics();
      return connection;
    }

    if (this.connections.length < this.config.max) {
      const connection = await this.createConnection();
      this.borrowedConnections.add(connection);

      const duration = (Date.now() - start) / 1000;
      poolConnectionDuration.observe(
        {
          pool_type: 'redis',
          pool_name: this.config.name,
        },
        duration
      );

      this.updateMetrics();
      return connection;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Redis connection pool timeout: ${this.config.name}`));
      }, this.config.acquireTimeoutMillis);

      const checkAvailable = () => {
        if (this.availableConnections.length > 0) {
          clearTimeout(timeout);
          const connection = this.availableConnections.pop()!;
          this.borrowedConnections.add(connection);
          this.updateMetrics();
          resolve(connection);
        } else {
          setTimeout(checkAvailable, 10);
        }
      };

      checkAvailable();
    });
  }

  async release(connection: Redis): Promise<void> {
    if (this.borrowedConnections.has(connection)) {
      this.borrowedConnections.delete(connection);

      if (connection.status === 'ready') {
        this.availableConnections.push(connection);
      } else {
        await this.destroy(connection);
      }

      poolOperationsTotal.inc({
        pool_type: 'redis',
        pool_name: this.config.name,
        operation: 'release',
        status: 'success',
      });

      this.updateMetrics();
    }
  }

  async destroy(connection: Redis): Promise<void> {
    try {
      this.borrowedConnections.delete(connection);

      const index = this.connections.indexOf(connection);
      if (index !== -1) {
        this.connections.splice(index, 1);
      }

      const availableIndex = this.availableConnections.indexOf(connection);
      if (availableIndex !== -1) {
        this.availableConnections.splice(availableIndex, 1);
      }

      await connection.disconnect();

      poolOperationsTotal.inc({
        pool_type: 'redis',
        pool_name: this.config.name,
        operation: 'destroy',
        status: 'success',
      });

      this.updateMetrics();
    } catch (error) {
      poolOperationsTotal.inc({
        pool_type: 'redis',
        pool_name: this.config.name,
        operation: 'destroy',
        status: 'error',
      });
      throw error;
    }
  }

  getStats(): IPoolStats {
    return {
      size: this.connections.length,
      available: this.availableConnections.length,
      borrowed: this.borrowedConnections.size,
      pending: 0,
      max: this.config.max,
      min: this.config.min,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const connection = await this.acquire();
      await connection.ping();
      await this.release(connection);
      return true;
    } catch (error) {
      this.logger.error(`Redis health check failed: ${this.config.name}`, error);
      return false;
    }
  }

  async drain(): Promise<void> {
    const allConnections = [...this.connections];

    for (const connection of allConnections) {
      await this.destroy(connection);
    }

    this.connections = [];
    this.availableConnections = [];
    this.borrowedConnections.clear();
  }

  async clear(): Promise<void> {
    await this.drain();
  }

  private updateMetrics(): void {
    const stats = this.getStats();

    poolConnectionsTotal.set(
      {
        pool_type: 'redis',
        pool_name: this.config.name,
        status: 'total',
      },
      stats.size
    );

    poolConnectionsActive.set(
      {
        pool_type: 'redis',
        pool_name: this.config.name,
      },
      stats.borrowed
    );

    poolConnectionsIdle.set(
      {
        pool_type: 'redis',
        pool_name: this.config.name,
      },
      stats.available
    );
  }

  private startHealthCheck(): void {
    if (this.config.enableHealthCheck) {
      this.healthCheckTimer = setInterval(async () => {
        await this.healthCheck();
      }, this.config.healthCheckIntervalMs);
    }
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    await this.drain();
  }
}
