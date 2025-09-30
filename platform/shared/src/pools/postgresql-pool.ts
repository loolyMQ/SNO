import { Pool as PgPool, PoolClient, PoolConfig } from 'pg';
import pino from 'pino';
import { IConnectionPool, IConnectionPoolConfig, IPoolStats } from './interfaces';
import {
  poolConnectionsTotal,
  poolConnectionsActive,
  poolConnectionsIdle,
  poolOperationsTotal,
  poolConnectionDuration,
  poolWaitingConnections,
} from './metrics';

export class PostgreSQLConnectionPool implements IConnectionPool<PoolClient> {
  private pool: PgPool;
  private logger: pino.Logger;
  private config: IConnectionPoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: IConnectionPoolConfig, pgConfig: PoolConfig, logger?: pino.Logger) {
    this.config = config;
    this.logger = logger || pino();

    this.pool = new PgPool({
      ...pgConfig,
      max: config.max,
      min: config.min,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.acquireTimeoutMillis,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    this.setupEventHandlers();
    this.startHealthCheck();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (_client: PoolClient) => {
      this.logger.debug(`PostgreSQL client connected: ${this.config.name}`);
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'connect',
        status: 'success',
      });
      this.updateMetrics();
    });

    this.pool.on('acquire', (_client: PoolClient) => {
      this.logger.debug(`PostgreSQL client acquired: ${this.config.name}`);
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'acquire',
        status: 'success',
      });
      this.updateMetrics();
    });

    this.pool.on('release', (_client: any) => {
      this.logger.debug(`PostgreSQL client released: ${this.config.name}`);
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'release',
        status: 'success',
      });
      this.updateMetrics();
    });

    this.pool.on('remove', (_client: PoolClient) => {
      this.logger.debug(`PostgreSQL client removed: ${this.config.name}`);
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'remove',
        status: 'success',
      });
      this.updateMetrics();
    });

    this.pool.on('error', (err: Error, _client: PoolClient) => {
      this.logger.error(`PostgreSQL pool error: ${this.config.name}`, err);
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'error',
        status: 'error',
      });
    });
  }

  async acquire(): Promise<PoolClient> {
    const start = Date.now();

    try {
      const client = await this.pool.connect();

      const duration = (Date.now() - start) / 1000;
      poolConnectionDuration.observe(
        {
          pool_type: 'postgresql',
          pool_name: this.config.name,
        },
        duration
      );

      return client;
    } catch (error) {
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'acquire',
        status: 'error',
      });
      throw error;
    }
  }

  async release(client: PoolClient): Promise<void> {
    try {
      client.release();
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'release',
        status: 'success',
      });
    } catch (error) {
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'release',
        status: 'error',
      });
      throw error;
    }
  }

  async destroy(client: PoolClient): Promise<void> {
    try {
      client.release(true);
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'destroy',
        status: 'success',
      });
    } catch (error) {
      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'destroy',
        status: 'error',
      });
      throw error;
    }
  }

  getStats(): IPoolStats {
    return {
      size: this.pool.totalCount,
      available: this.pool.idleCount,
      borrowed: this.pool.totalCount - this.pool.idleCount,
      pending: this.pool.waitingCount,
      max: this.config.max,
      min: this.config.min,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.acquire();
      await client.query('SELECT 1');
      await this.release(client);
      return true;
    } catch (error) {
      this.logger.error(`PostgreSQL health check failed: ${this.config.name}`, error);
      return false;
    }
  }

  async drain(): Promise<void> {
    await this.pool.end();
  }

  async clear(): Promise<void> {
    await this.drain();
  }

  private updateMetrics(): void {
    const stats = this.getStats();

    poolConnectionsTotal.set(
      {
        pool_type: 'postgresql',
        pool_name: this.config.name,
        status: 'total',
      },
      stats.size
    );

    poolConnectionsActive.set(
      {
        pool_type: 'postgresql',
        pool_name: this.config.name,
      },
      stats.borrowed
    );

    poolConnectionsIdle.set(
      {
        pool_type: 'postgresql',
        pool_name: this.config.name,
      },
      stats.available
    );

    poolWaitingConnections.set(
      {
        pool_type: 'postgresql',
        pool_name: this.config.name,
      },
      stats.pending
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

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      this.logger.debug(
        {
          query: text,
          duration,
          rows: result.rowCount,
        },
        'PostgreSQL query executed'
      );

      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'query',
        status: 'success',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.logger.error(
        {
          query: text,
          duration,
          error: error,
        },
        'PostgreSQL query failed'
      );

      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'query',
        status: 'error',
      });

      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.acquire();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');

      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'transaction',
        status: 'success',
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');

      poolOperationsTotal.inc({
        pool_type: 'postgresql',
        pool_name: this.config.name,
        operation: 'transaction',
        status: 'error',
      });

      throw error;
    } finally {
      await this.release(client);
    }
  }

  getPool(): PgPool {
    return this.pool;
  }
}
