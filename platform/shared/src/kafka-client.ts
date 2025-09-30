import { Kafka, Producer, Consumer, KafkaMessage as KafkaJSMessage } from 'kafkajs';
import pino from 'pino';

const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export interface IKafkaMessage {
  type: string;
  payload: unknown;
  correlationId?: string;
  userId?: string;
  timestamp?: number;
  source: string;
}

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private serviceName: string;
  private isConnected: boolean = false;

  constructor(serviceName: string, brokers: string[] = ['localhost:9092']) {
    this.serviceName = serviceName;
    this.kafka = new Kafka({
      clientId: `${serviceName}-client`,
      brokers,
      retry: {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
      logLevel: 1,
    });
  }

  async connect(): Promise<void> {
    try {
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });

      this.consumer = this.kafka.consumer({
        groupId: `${this.serviceName}-group`,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;

      logger.info(`📡 Kafka client connected for ${this.serviceName}`);
    } catch (error) {
      logger.error('❌ Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      this.isConnected = false;
      logger.info(`📡 Kafka client disconnected for ${this.serviceName}`);
    } catch (error) {
      logger.error('❌ Failed to disconnect from Kafka:', error);
      throw error;
    }
  }

  async publish(
    topic: string,
    message: Omit<IKafkaMessage, 'timestamp' | 'source'>
  ): Promise<void> {
    if (!this.producer || !this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    const kafkaMessage: IKafkaMessage = {
      ...message,
      timestamp: Date.now(),
      source: this.serviceName,
    };

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: kafkaMessage.correlationId || kafkaMessage.userId || 'default',
            value: JSON.stringify(kafkaMessage),
            timestamp: (kafkaMessage.timestamp || Date.now()).toString(),
          },
        ],
      });

      logger.info(`📤 Published event to ${topic}:`, {
        type: kafkaMessage.type,
        correlationId: kafkaMessage.correlationId,
        source: this.serviceName,
      });
    } catch (error) {
      logger.error(`❌ Failed to publish to ${topic}:`, error);
      throw error;
    }
  }

  async subscribe(
    topics: string[],
    handlers: Record<string, (message: IKafkaMessage) => Promise<void>>
  ): Promise<void> {
    if (!this.consumer || !this.isConnected) {
      throw new Error('Kafka consumer not connected');
    }

    try {
      await this.consumer.subscribe({ topics, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({
          topic,
          partition,
          message,
        }: {
          topic: string;
          partition: number;
          message: KafkaJSMessage;
        }) => {
          try {
            if (!message.value) {
              logger.warn('Received empty message');
              return;
            }

            const kafkaMessage: IKafkaMessage = JSON.parse(message.value.toString());

            logger.info(`📥 Received event from ${topic}:`, {
              type: kafkaMessage.type,
              correlationId: kafkaMessage.correlationId,
              source: kafkaMessage.source,
              partition,
            });

            const handler = handlers[kafkaMessage.type];
            if (handler) {
              await handler(kafkaMessage);
              logger.info(`✅ Event processed successfully: ${kafkaMessage.type}`);
            } else {
              logger.warn(`⚠️ No handler found for event type: ${kafkaMessage.type}`);
            }
          } catch (error) {
            logger.error('❌ Error processing message:', error);
            throw error;
          }
        },
      });

      logger.info(`📥 Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      logger.error('❌ Failed to subscribe to topics:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.producer !== null && this.consumer !== null;
  }

  getServiceName(): string {
    return this.serviceName;
  }
}

export const createKafkaClient = (serviceName: string): KafkaClient => {
  const brokers = process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9092'];
  return new KafkaClient(serviceName, brokers);
};
