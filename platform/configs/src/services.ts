import { z } from 'zod';

export const ServiceConfigSchema = z.object({
  name: z.string(),
  port: z.number(),
  host: z.string().default('localhost'),
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().default(30000),
    timeout: z.number().default(5000)
  }).default({})
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export const createServiceConfig = (name: string, port: number): ServiceConfig => {
  return ServiceConfigSchema.parse({
    name,
    port,
    host: process.env.SERVICE_HOST || 'localhost',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
    logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '30000'),
    retries: parseInt(process.env.SERVICE_RETRIES || '3'),
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000')
    }
  });
};
