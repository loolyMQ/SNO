import { Kafka } from 'kafkajs';
export class KafkaClient {
  constructor(config) {
    this.config = config;
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
  }
  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
  }
  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
  async publishEvent(topic, event) {
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
  async subscribeToTopic(topic, handler) {
    await this.consumer.subscribe({ topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await handler(event);
        } catch (error) {
          console.error(`Error processing message from topic ${topic}:`, error);
        }
      },
    });
  }
}
// Создание экземпляра клиента
export function createKafkaClient(config) {
  return new KafkaClient(config);
}
//# sourceMappingURL=client.js.map
