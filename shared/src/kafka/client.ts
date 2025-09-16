import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaEvent, ServiceConfig } from '../types';

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async publishEvent(topic: string, event: KafkaEvent): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.id,
          value: JSON.stringify(event),
          timestamp: event.timestamp.toString(),
        },
      ],
    });
  }

  async subscribeToTopic(
    topic: string,
    handler: (event: KafkaEvent) => Promise<void>,
  ): Promise<void> {
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          const event: KafkaEvent = JSON.parse(message.value?.toString() || '{}');
          await handler(event);
        } catch (error) {
          console.error(`Error processing message from topic ${topic}:`, error);
        }
      },
    });
  }
}

// Создание экземпляра клиента
export function createKafkaClient(config: ServiceConfig): KafkaClient {
  return new KafkaClient(config);
}
