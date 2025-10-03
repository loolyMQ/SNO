import { z } from 'zod';

export const KafkaConfigSchema = z.object({
  clientId: z.string(),
  brokers: z.array(z.string()),
  groupId: z.string(),
  retry: z.object({
    initialRetryTime: z.number().default(100),
    maxRetryTime: z.number().default(30000),
    retries: z.number().default(5)
  }).default({}),
  ssl: z.boolean().default(false),
  sasl: z.object({
    mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional()
});

export type KafkaConfig = z.infer<typeof KafkaConfigSchema>;

export const createKafkaConfig = (clientId: string, groupId: string): KafkaConfig => {
  return KafkaConfigSchema.parse({
    clientId,
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId,
    retry: {
      initialRetryTime: parseInt(process.env.KAFKA_RETRY_INITIAL || '100'),
      maxRetryTime: parseInt(process.env.KAFKA_RETRY_MAX || '30000'),
      retries: parseInt(process.env.KAFKA_RETRIES || '5')
    },
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_MECHANISM ? {
      mechanism: process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD
    } : undefined
  });
};
