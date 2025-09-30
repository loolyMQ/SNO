import { PostgreSQLConnectionPool } from './postgresql-pool';
import { RedisConnectionPool } from './redis-pool';
// import { ConnectionPoolManager } from './pool-manager';
export * from './interfaces';
export * from './metrics';
export * from './postgresql-pool';
export * from './redis-pool';
export * from './pool-manager';
export const createPostgreSQLPool = (config, pgConfig, logger) => {
    return new PostgreSQLConnectionPool(config, pgConfig, logger);
};
export const createRedisPool = (config, redisConfig, logger) => {
    return new RedisConnectionPool(config, redisConfig, logger);
};
//# sourceMappingURL=index.js.map