import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

export interface ServiceConfig {
  port: number;
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
}

export interface KafkaMessage {
  key?: string;
  value: string;
  headers?: Record<string, string>;
  timestamp?: number;
}

export interface KafkaClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: KafkaMessage): Promise<void>;
  subscribe(topic: string, handler: (message: KafkaMessage) => void): Promise<void>;
}

export class KafkaClientImpl implements KafkaClient {
  constructor(private config: ServiceConfig) {}

  async connect(): Promise<void> {
    logger.info({
      service: 'kafka-client',
      action: 'connect',
      brokers: this.config.kafka.brokers
    }, 'Connecting to Kafka...');
  }

  async disconnect(): Promise<void> {
    logger.info({
      service: 'kafka-client',
      action: 'disconnect'
    }, 'Disconnecting from Kafka...');
  }

  async publish(topic: string, message: KafkaMessage): Promise<void> {
    logger.info({
      service: 'kafka-client',
      action: 'publish',
      topic,
      messageKey: message.key
    }, `Publishing to topic ${topic}`);
  }

  async subscribe(topic: string, _handler: (message: KafkaMessage) => void): Promise<void> {
    logger.info({
      service: 'kafka-client',
      action: 'subscribe',
      topic
    }, `Subscribing to topic ${topic}`);
  }
}

export function createKafkaClient(config: ServiceConfig): KafkaClient {
  return new KafkaClientImpl(config);
}

export { CircuitBreaker, CircuitBreakerManager, CircuitBreakerConfig, CircuitState, CircuitBreakerMetrics } from './circuit-breaker';
export { GrpcClient, GrpcClientManager, GrpcServer, GrpcServerManager, createGrpcClient, createGrpcServer, GRPC_CLIENT_CONFIGS, GRPC_SERVER_CONFIGS } from './grpc/client';
export { GrpcClientConfig, GrpcServerConfig, GrpcServiceImplementation } from './grpc/server';
