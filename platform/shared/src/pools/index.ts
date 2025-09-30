// import { Pool as PgPool, PoolConfig } from 'pg';
// import { Kafka } from 'kafkajs';
import pino from 'pino';
import { IConnectionPoolConfig } from './interfaces';
import { PostgreSQLConnectionPool } from './postgresql-pool';
import { RedisConnectionPool } from './redis-pool';
// import { ConnectionPoolManager } from './pool-manager';

export * from './interfaces';
export * from './metrics';
export * from './postgresql-pool';
export * from './redis-pool';
export * from './pool-manager';

export const createPostgreSQLPool = (
  config: IConnectionPoolConfig,
  pgConfig: any,
  logger?: pino.Logger
): PostgreSQLConnectionPool => {
  return new PostgreSQLConnectionPool(config, pgConfig, logger);
};

export const createRedisPool = (
  config: IConnectionPoolConfig,
  redisConfig: Record<string, unknown>,
  logger?: pino.Logger
): RedisConnectionPool => {
  return new RedisConnectionPool(config, redisConfig, logger);
};
