import { z } from 'zod';

export const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean().default(false),
  pool: z.object({
    min: z.number().default(2),
    max: z.number().default(10),
    idleTimeoutMillis: z.number().default(30000),
    connectionTimeoutMillis: z.number().default(2000)
  }).default({})
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

export const createDatabaseConfig = (): DatabaseConfig => {
  return DatabaseConfigSchema.parse({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'science_map',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000')
    }
  });
};
