import { injectable } from 'inversify';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface ConnectionPoolConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
  ssl?: boolean;
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  activeConnections: number;
  maxConnections: number;
  minConnections: number;
}

@injectable()
export class ConnectionPoolService extends BaseService {
  private readonly pools: Map<string, Pool> = new Map();
  private readonly poolConfigs: Map<string, ConnectionPoolConfig> = new Map();

  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    super(logger, metrics);
  }

  async createPool(name: string, config: ConnectionPoolConfig): Promise<Pool> {
    return await this.executeWithMetrics('pool.create', async () => {
      if (this.pools.has(name)) {
        throw new Error(`Pool ${name} already exists`);
      }

      const poolConfig: PoolConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        max: config.maxConnections,
        min: config.minConnections,
        connectionTimeoutMillis: config.connectionTimeout,
        idleTimeoutMillis: config.idleTimeout,
        // maxLifetime: config.maxLifetime, // Not supported in pg PoolConfig
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 0
      };

      const pool = new Pool(poolConfig);

      // Event listeners
      pool.on('connect', (client: PoolClient) => {
        this.logger.debug('New client connected to pool', {
          poolName: name,
          processId: (client as { processID?: number }).processID
        });

        this.metrics.incrementCounter('pool.connections.created', {
          poolName: name
        });
      });

      pool.on('acquire', (client: PoolClient) => {
        this.logger.debug('Client acquired from pool', {
          poolName: name,
          processId: (client as { processID?: number }).processID
        });

        this.metrics.incrementCounter('pool.connections.acquired', {
          poolName: name
        });
      });

      pool.on('remove', (client: PoolClient) => {
        this.logger.debug('Client removed from pool', {
          poolName: name,
          processId: (client as { processID?: number }).processID
        });

        this.metrics.incrementCounter('pool.connections.removed', {
          poolName: name
        });
      });

      pool.on('error', (error: Error, client: PoolClient) => {
        this.logger.error('Pool error', {
          poolName: name,
          processId: (client as { processID?: number })?.processID,
          error: error instanceof Error ? error.message : String(error)
        });

        this.metrics.incrementCounter('pool.errors', {
          poolName: name,
          error: error.name
        });
      });

      this.pools.set(name, pool);
      this.poolConfigs.set(name, config);

      this.logger.info('Connection pool created', {
        poolName: name,
        host: config.host,
        port: config.port,
        database: config.database,
        maxConnections: config.maxConnections,
        minConnections: config.minConnections
      });

      this.metrics.incrementCounter('pool.created', {
        poolName: name
      });

      return pool;
    });
  }

  async getConnection(poolName: string): Promise<PoolClient> {
    return await this.executeWithMetrics('pool.get_connection', async () => {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool ${poolName} not found`);
      }

      try {
        const client = await pool.connect();
        
        this.logger.debug('Connection acquired from pool', {
          poolName,
          processId: (client as { processID?: number }).processID
        });

        this.metrics.incrementCounter('pool.connections.acquired', {
          poolName
        });

        return client;

      } catch (error) {
        this.logger.error('Failed to acquire connection from pool', {
          poolName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('pool.connections.failed', {
          poolName,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        throw error;
      }
    });
  }

  async releaseConnection(poolName: string, client: PoolClient): Promise<void> {
    await this.executeWithMetrics('pool.release_connection', async () => {
      try {
        client.release();
        
        this.logger.debug('Connection released to pool', {
          poolName,
          processId: (client as { processID?: number }).processID
        });

        this.metrics.incrementCounter('pool.connections.released', {
          poolName
        });

      } catch (error) {
        this.logger.error('Failed to release connection to pool', {
          poolName,
          processId: (client as { processID?: number }).processID,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('pool.connections.release_failed', {
          poolName,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        throw error;
      }
    });
  }

  async executeQuery<T = unknown>(
    poolName: string,
    query: string,
    params: unknown[] = []
  ): Promise<T[]> {
    return await this.executeWithMetrics('pool.execute_query', async () => {
      const client = await this.getConnection(poolName);
      
      try {
        const startTime = Date.now();
        const result = await client.query(query, params);
        const duration = Date.now() - startTime;

        this.logger.debug('Query executed successfully', {
          poolName,
          query: query.substring(0, 100),
          rowCount: result.rowCount,
          duration
        });

        this.metrics.incrementCounter('pool.queries.executed', {
          poolName
        });

        this.metrics.recordHistogram('pool.queries.duration', duration, {
          poolName
        });

        return result.rows;

      } catch (error) {
        this.logger.error('Query execution failed', {
          poolName,
          query: query.substring(0, 100),
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('pool.queries.failed', {
          poolName,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        throw error;

      } finally {
        await this.releaseConnection(poolName, client);
      }
    });
  }

  async executeTransaction<T>(
    poolName: string,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    return await this.executeWithMetrics('pool.execute_transaction', async () => {
      const client = await this.getConnection(poolName);
      
      try {
        await client.query('BEGIN');
        
        const result = await callback(client);
        
        await client.query('COMMIT');
        
        this.logger.debug('Transaction completed successfully', {
          poolName,
          processId: (client as { processID?: number }).processID
        });

        this.metrics.incrementCounter('pool.transactions.completed', {
          poolName
        });

        return result;

      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          this.logger.error('Failed to rollback transaction', {
            poolName,
            processId: (client as { processID?: number }).processID,
            rollbackError: rollbackError instanceof Error ? rollbackError.message : 'Unknown error'
          });
        }

        this.logger.error('Transaction failed', {
          poolName,
          processId: (client as { processID?: number }).processID,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        this.metrics.incrementCounter('pool.transactions.failed', {
          poolName,
          error: error instanceof Error ? error.name : 'Unknown'
        });

        throw error;

      } finally {
        await this.releaseConnection(poolName, client);
      }
    });
  }

  async getPoolMetrics(poolName: string): Promise<PoolMetrics> {
    return await this.executeWithMetrics('pool.get_metrics', async () => {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool ${poolName} not found`);
      }

      const config = this.poolConfigs.get(poolName)!;

      return {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount,
        activeConnections: pool.totalCount - pool.idleCount,
        maxConnections: config.maxConnections,
        minConnections: config.minConnections
      };
    });
  }

  async getAllPoolsMetrics(): Promise<Record<string, PoolMetrics>> {
    const metrics: Record<string, PoolMetrics> = {};
    
    for (const poolName of this.pools.keys()) {
      metrics[poolName] = await this.getPoolMetrics(poolName);
    }

    return metrics;
  }

  async healthCheck(poolName: string): Promise<boolean> {
    try {
      await this.executeQuery(poolName, 'SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Pool health check failed', {
        poolName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async closePool(poolName: string): Promise<void> {
    await this.executeWithMetrics('pool.close', async () => {
      const pool = this.pools.get(poolName);
      if (!pool) {
        throw new Error(`Pool ${poolName} not found`);
      }

      await pool.end();

      this.pools.delete(poolName);
      this.poolConfigs.delete(poolName);

      this.logger.info('Connection pool closed', {
        poolName
      });

      this.metrics.incrementCounter('pool.closed', {
        poolName
      });
    });
  }

  async closeAllPools(): Promise<void> {
    const poolNames = Array.from(this.pools.keys());
    
    for (const poolName of poolNames) {
      await this.closePool(poolName);
    }

    this.logger.info('All connection pools closed', {
      poolsCount: poolNames.length
    });
  }

  getPoolNames(): string[] {
    return Array.from(this.pools.keys());
  }

  hasPool(poolName: string): boolean {
    return this.pools.has(poolName);
  }
}
