import { injectable } from 'inversify';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { BaseService } from '../services/base.service';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: Date;
  data: unknown;
  metadata: Record<string, unknown>;
}

interface EventBusHandler {
  eventType: string;
  handler: (_event: DomainEvent) => Promise<void>;
}

@injectable()
export class EventBusService extends BaseService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private handlers: Map<string, EventBusHandler[]> = new Map();
  private isConnected: boolean = false;

  constructor(
    logger: LoggerService,
    metrics: MetricsService
  ) {
    super(logger, metrics);
    
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'science-map-platform',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000
    });

    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'science-map-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
  }

  async connect(): Promise<void> {
    await this.executeWithMetrics('eventbus.connect', async () => {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.info('Event bus connected successfully');
    });
  }

  async disconnect(): Promise<void> {
    await this.executeWithMetrics('eventbus.disconnect', async () => {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.info('Event bus disconnected successfully');
    });
  }

  async publish(event: DomainEvent, topic?: string): Promise<void> {
    await this.executeWithMetrics('eventbus.publish', async () => {
      if (!this.isConnected) {
        throw new Error('Event bus not connected');
      }

      const eventTopic = topic || this.getTopicForEvent(event.type);
      const message = {
        key: event.aggregateId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.type,
          aggregateType: event.aggregateType,
          version: event.version.toString(),
          timestamp: event.timestamp.toISOString()
        }
      };

      await this.producer.send({
        topic: eventTopic,
        messages: [message]
      });

      this.logger.debug('Event published', {
        eventId: event.id,
        eventType: event.type,
        topic: eventTopic,
        aggregateId: event.aggregateId
      });

      this.metrics.incrementCounter('eventbus.events.published', {
        eventType: event.type,
        topic: eventTopic
      });
    });
  }

  async subscribe(eventType: string, handler: EventBusHandler['handler']): Promise<void> {
    await this.executeWithMetrics('eventbus.subscribe', async () => {
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, []);
      }

      this.handlers.get(eventType)!.push({
        eventType,
        handler
      });

      const topic = this.getTopicForEvent(eventType);
      await this.consumer.subscribe({ topic, fromBeginning: false });

      this.logger.info('Event handler subscribed', {
        eventType,
        topic
      });

      this.metrics.incrementCounter('eventbus.handlers.subscribed', {
        eventType,
        topic
      });
    });
  }

  async startConsuming(): Promise<void> {
    await this.executeWithMetrics('eventbus.start_consuming', async () => {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        }
      });

      this.logger.info('Event bus started consuming messages');
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    try {
      const event: DomainEvent = JSON.parse(payload.message.value?.toString() || '{}');
      const eventType = event.type;

      if (!eventType) {
        this.logger.warn('Received message without event type', {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset
        });
        return;
      }

      const handlers = this.handlers.get(eventType) || [];
      
      if (handlers.length === 0) {
        this.logger.warn('No handlers found for event type', { eventType });
        return;
      }

      // Execute all handlers for this event type
      const handlerPromises = handlers.map(handler => 
        this.executeHandler(handler, event)
      );

      await Promise.allSettled(handlerPromises);

      this.metrics.incrementCounter('eventbus.events.processed', {
        eventType,
        topic: payload.topic
      });

    } catch (error) {
      this.logger.error('Error handling message', {
        error,
        topic: payload.topic,
        partition: payload.partition,
        offset: payload.message.offset
      });

      this.metrics.incrementCounter('eventbus.events.error', {
        topic: payload.topic,
        error: error instanceof Error ? error.name : 'Unknown'
      });
    }
  }

  private async executeHandler(handler: EventBusHandler, event: DomainEvent): Promise<void> {
    try {
      await this.executeWithMetrics('eventbus.handler.execute', async () => {
        await handler.handler(event);
      });

      this.logger.debug('Event handler executed successfully', {
        eventType: event.type,
        eventId: event.id,
        handlerEventType: handler.eventType
      });

    } catch (error) {
      this.logger.error('Event handler failed', {
        error,
        eventType: event.type,
        eventId: event.id,
        handlerEventType: handler.eventType
      });

      this.metrics.incrementCounter('eventbus.handlers.error', {
        eventType: event.type,
        handlerEventType: handler.eventType,
        error: error instanceof Error ? error.name : 'Unknown'
      });

      throw error;
    }
  }

  private getTopicForEvent(eventType: string): string {
    // Convert event type to topic name
    // e.g., "UserCreated" -> "user-created"
    return eventType
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  createEvent(
    type: string,
    aggregateId: string,
    aggregateType: string,
    data: unknown,
    metadata: Record<string, unknown> = {}
  ): DomainEvent {
    return {
      id: this.generateEventId(),
      type,
      aggregateId,
      aggregateType,
      version: 1,
      timestamp: new Date(),
      data,
      metadata
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getHealthStatus(): { connected: boolean; handlers: number; topics: string[] } {
    const topics = Array.from(new Set(
      Array.from(this.handlers.keys()).map(eventType => this.getTopicForEvent(eventType))
    ));

    return {
      connected: this.isConnected,
      handlers: Array.from(this.handlers.values()).flat().length,
      topics
    };
  }
}
