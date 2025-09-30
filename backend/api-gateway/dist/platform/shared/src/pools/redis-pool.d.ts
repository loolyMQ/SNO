import Redis from 'ioredis';
import pino from 'pino';
import { IConnectionPool, IConnectionPoolConfig, IPoolStats } from './interfaces';
export declare class RedisConnectionPool implements IConnectionPool<Redis> {
    private connections;
    private availableConnections;
    private borrowedConnections;
    private config;
    private redisConfig;
    private logger;
    private healthCheckTimer?;
    constructor(config: IConnectionPoolConfig, redisConfig: Record<string, unknown>, logger?: pino.Logger);
    private initialize;
    private createConnection;
    acquire(): Promise<Redis>;
    release(connection: Redis): Promise<void>;
    destroy(connection: Redis): Promise<void>;
    getStats(): IPoolStats;
    healthCheck(): Promise<boolean>;
    drain(): Promise<void>;
    clear(): Promise<void>;
    private updateMetrics;
    private startHealthCheck;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=redis-pool.d.ts.map