import { Pool as PgPool, PoolClient, PoolConfig } from 'pg';
import pino from 'pino';
import { IConnectionPool, IConnectionPoolConfig, IPoolStats } from './interfaces';
export declare class PostgreSQLConnectionPool implements IConnectionPool<PoolClient> {
    private pool;
    private logger;
    private config;
    private healthCheckTimer?;
    constructor(config: IConnectionPoolConfig, pgConfig: PoolConfig, logger?: pino.Logger);
    private setupEventHandlers;
    acquire(): Promise<PoolClient>;
    release(client: PoolClient): Promise<void>;
    destroy(client: PoolClient): Promise<void>;
    getStats(): IPoolStats;
    healthCheck(): Promise<boolean>;
    drain(): Promise<void>;
    clear(): Promise<void>;
    private updateMetrics;
    private startHealthCheck;
    shutdown(): Promise<void>;
    query(text: string, params?: unknown[]): Promise<unknown>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    getPool(): PgPool;
}
//# sourceMappingURL=postgresql-pool.d.ts.map