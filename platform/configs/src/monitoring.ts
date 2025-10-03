import { z } from 'zod';

export const MonitoringConfigSchema = z.object({
  prometheus: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(9090),
    path: z.string().default('/metrics')
  }).default({}),
  grafana: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(3000)
  }).default({}),
  jaeger: z.object({
    enabled: z.boolean().default(true),
    endpoint: z.string().default('http://localhost:14268/api/traces')
  }).default({}),
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(8080),
    path: z.string().default('/health')
  }).default({})
});

export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>;

export const createMonitoringConfig = (): MonitoringConfig => {
  return MonitoringConfigSchema.parse({
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED !== 'false',
      port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
      path: process.env.PROMETHEUS_PATH || '/metrics'
    },
    grafana: {
      enabled: process.env.GRAFANA_ENABLED !== 'false',
      port: parseInt(process.env.GRAFANA_PORT || '3000')
    },
    jaeger: {
      enabled: process.env.JAEGER_ENABLED !== 'false',
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
    },
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      port: parseInt(process.env.HEALTH_CHECK_PORT || '8080'),
      path: process.env.HEALTH_CHECK_PATH || '/health'
    }
  });
};
