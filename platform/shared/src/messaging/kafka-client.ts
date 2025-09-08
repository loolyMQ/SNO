import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { Logger } from '../logging/logger';

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  retry?: {
    retries?: number;
    initialRetryTime?: number;
    maxRetryTime?: number;
  };
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

export interface MessagePayload {
  topic: string;
  key?: string;
  value: any;
  headers?: Record<string, string>;
  partition?: number;
  timestamp?: string;
}

export interface ConsumerConfig {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  autoCommitInterval?: number;
  maxBytesPerPartition?: number;
  sessionTimeout?: number;
  heartbeatInterval?: number;
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer | null = null;
  private logger: Logger;
  private isConnected = false;

  constructor(config: KafkaConfig, logger: Logger) {
    this.logger = logger;
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: config.retry || {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
      ssl: config.ssl,
      sasl: config.sasl as any,
    });

    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.info('Kafka producer connected successfully', {
        service: 'kafka-client',
        component: 'producer',
      } as any);
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', {
        service: 'kafka-client',
        component: 'producer',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as any);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
      }
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.info('Kafka client disconnected successfully', {
        service: 'kafka-client',
      } as any);
    } catch (error) {
      this.logger.error('Failed to disconnect Kafka client', {
        service: 'kafka-client',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as any);
      throw error;
    }
  }

  async sendMessage(payload: MessagePayload): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka client is not connected');
    }

    try {
      const message = {
        topic: payload.topic,
        messages: [
          {
            key: payload.key,
            value: JSON.stringify(payload.value),
            headers: payload.headers,
            partition: payload.partition,
            timestamp: payload.timestamp,
          },
        ],
      };

      await this.producer.send(message);
      
      this.logger.info('Message sent successfully', {
        service: 'kafka-client',
        component: 'producer',
        topic: payload.topic,
        key: payload.key,
      } as any);
    } catch (error) {
      this.logger.error('Failed to send message', {
        service: 'kafka-client',
        component: 'producer',
        topic: payload.topic,
        key: payload.key,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as any);
      throw error;
    }
  }

  async createConsumer(config: ConsumerConfig): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
    }

    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: config.sessionTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 3000,
      maxBytesPerPartition: config.maxBytesPerPartition || 1048576,
    });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: config.topics,
      fromBeginning: config.fromBeginning || false,
    });

    this.logger.info('Kafka consumer created successfully', {
      service: 'kafka-client',
      component: 'consumer',
      groupId: config.groupId,
      topics: config.topics,
    } as any);
  }

  async startConsuming(
    messageHandler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not created. Call createConsumer first.');
    }

    await this.consumer.run({
      eachMessage: async (payload) => {
        try {
          await messageHandler(payload);
        } catch (error) {
          this.logger.error('Error processing message', {
            service: 'kafka-client',
            component: 'consumer',
            topic: payload.topic,
            partition: payload.partition,
            offset: payload.message.offset,
            error: error instanceof Error ? error.message : 'Unknown error',
          } as any);
          throw error;
        }
      },
    });

    this.logger.info('Kafka consumer started successfully', {
      service: 'kafka-client',
      component: 'consumer',
    } as any);
  }

  async createTopic(topic: string, partitions = 1, replicationFactor = 1): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: partitions,
            replicationFactor,
          },
        ],
      });

      this.logger.info('Topic created successfully', {
        service: 'kafka-client',
        component: 'admin',
        topic,
        partitions,
        replicationFactor,
      } as any);
    } catch (error) {
      this.logger.error('Failed to create topic', {
        service: 'kafka-client',
        component: 'admin',
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as any);
      throw error;
    } finally {
      await admin.disconnect();
    }
  }

  async getTopicMetadata(topic: string): Promise<any> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
      return metadata;
    } catch (error) {
      this.logger.error('Failed to fetch topic metadata', {
        service: 'kafka-client',
        component: 'admin',
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as any);
      throw error;
    } finally {
      await admin.disconnect();
    }
  }
}

// Factory function for creating Kafka client
export function createKafkaClient(config: KafkaConfig, logger: Logger): KafkaClient {
  return new KafkaClient(config, logger);
}

// Default configuration
export const defaultKafkaConfig: KafkaConfig = {
  clientId: 'science-map-client',
  brokers: process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9092'],
  retry: {
    retries: 5,
    initialRetryTime: 100,
    maxRetryTime: 30000,
  },
};