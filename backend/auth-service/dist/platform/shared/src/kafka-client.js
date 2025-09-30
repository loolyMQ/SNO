import { Kafka } from 'kafkajs';
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
export class KafkaClient {
    kafka;
    producer = null;
    consumer = null;
    serviceName;
    isConnected = false;
    constructor(serviceName, brokers = ['localhost:9092']) {
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
    async connect() {
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
        }
        catch (error) {
            logger.error('❌ Failed to connect to Kafka:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            if (this.producer) {
                await this.producer.disconnect();
            }
            if (this.consumer) {
                await this.consumer.disconnect();
            }
            this.isConnected = false;
            logger.info(`📡 Kafka client disconnected for ${this.serviceName}`);
        }
        catch (error) {
            logger.error('❌ Failed to disconnect from Kafka:', error);
            throw error;
        }
    }
    async publish(topic, message) {
        if (!this.producer || !this.isConnected) {
            throw new Error('Kafka producer not connected');
        }
        const kafkaMessage = {
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
        }
        catch (error) {
            logger.error(`❌ Failed to publish to ${topic}:`, error);
            throw error;
        }
    }
    async subscribe(topics, handlers) {
        if (!this.consumer || !this.isConnected) {
            throw new Error('Kafka consumer not connected');
        }
        try {
            await this.consumer.subscribe({ topics, fromBeginning: false });
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message, }) => {
                    try {
                        if (!message.value) {
                            logger.warn('Received empty message');
                            return;
                        }
                        const kafkaMessage = JSON.parse(message.value.toString());
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
                        }
                        else {
                            logger.warn(`⚠️ No handler found for event type: ${kafkaMessage.type}`);
                        }
                    }
                    catch (error) {
                        logger.error('❌ Error processing message:', error);
                        throw error;
                    }
                },
            });
            logger.info(`📥 Subscribed to topics: ${topics.join(', ')}`);
        }
        catch (error) {
            logger.error('❌ Failed to subscribe to topics:', error);
            throw error;
        }
    }
    isReady() {
        return this.isConnected && this.producer !== null && this.consumer !== null;
    }
    getServiceName() {
        return this.serviceName;
    }
}
export const createKafkaClient = (serviceName) => {
    const brokers = process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9092'];
    return new KafkaClient(serviceName, brokers);
};
//# sourceMappingURL=kafka-client.js.map