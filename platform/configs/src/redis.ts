import { z } from 'zod';

export const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(6379),
  password: z.string().optional(),
  db: z.number().default(0),
  retryDelayOnFailover: z.number().default(100),
  maxRetriesPerRequest: z.number().default(3),
  lazyConnect: z.boolean().default(true),
  keepAlive: z.number().default(30000),
  family: z.number().default(4),
  keyPrefix: z.string().default('science-map:')
});

export type RedisConfig = z.infer<typeof RedisConfigSchema>;

export const createRedisConfig = (): RedisConfig => {
  return RedisConfigSchema.parse({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
    keepAlive: parseInt(process.env.REDIS_KEEPALIVE || '30000'),
    family: parseInt(process.env.REDIS_FAMILY || '4'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'science-map:'
  });
};
