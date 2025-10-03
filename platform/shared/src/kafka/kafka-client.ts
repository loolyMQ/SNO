import { Kafka } from 'kafkajs';

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export function createKafkaClient(config: KafkaConfig): Kafka {
  const kafkaConfig: KafkaConfig = {
    clientId: config.clientId,
    brokers: config.brokers,
    connectionTimeout: config.connectionTimeout || 3000,
    requestTimeout: config.requestTimeout || 30000,
    retry: {
      initialRetryTime: config.retry?.initialRetryTime || 100,
      retries: config.retry?.retries || 5
    }
  };

  if (config.ssl) {
    kafkaConfig.ssl = config.ssl;
  }

  if (config.sasl) {
    kafkaConfig.sasl = config.sasl;
  }

  return new Kafka(kafkaConfig as unknown as import('kafkajs').KafkaConfig);
}

export function createKafkaClientFromEnv(): Kafka {
  const config: KafkaConfig = {
    clientId: process.env.KAFKA_CLIENT_ID || 'science-map-platform',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ...(process.env.KAFKA_SSL === 'true' ? { ssl: true } : {}),
    ...(process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD ? {
      sasl: {
        mechanism: (process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512') || 'plain',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
      }
    } : {}),
    connectionTimeout: Number(process.env.KAFKA_CONNECTION_TIMEOUT) || 3000,
    requestTimeout: Number(process.env.KAFKA_REQUEST_TIMEOUT) || 30000,
    retry: {
      initialRetryTime: Number(process.env.KAFKA_INITIAL_RETRY_TIME) || 100,
      retries: Number(process.env.KAFKA_RETRIES) || 5
    }
  };

  return createKafkaClient(config);
}
