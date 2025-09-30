import pino from 'pino';
import { IConnectionPoolConfig } from './interfaces';
import { PostgreSQLConnectionPool } from './postgresql-pool';
import { RedisConnectionPool } from './redis-pool';
export * from './interfaces';
export * from './metrics';
export * from './postgresql-pool';
export * from './redis-pool';
export * from './pool-manager';
export declare const createPostgreSQLPool: (config: IConnectionPoolConfig, pgConfig: any, logger?: pino.Logger) => PostgreSQLConnectionPool;
export declare const createRedisPool: (config: IConnectionPoolConfig, redisConfig: Record<string, unknown>, logger?: pino.Logger) => RedisConnectionPool;
//# sourceMappingURL=index.d.ts.map