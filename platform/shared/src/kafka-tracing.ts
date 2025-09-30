import { TracingManager, TracingUtils } from './tracing';
import { KafkaClient, IKafkaMessage } from './kafka-client';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

export interface ITracedKafkaMessage extends IKafkaMessage {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  correlationId?: string;
}

export class TracedKafkaProducer {
  constructor(
    private kafkaClient: KafkaClient,
    private tracingManager: TracingManager
  ) {}

  async publish(topic: string, message: IKafkaMessage): Promise<void> {
    const startTime = Date.now();

    return this.tracingManager.traceFunction(
      `Kafka Produce ${topic}`,
      async (span: any) => {
        try {
          const tracedMessage: ITracedKafkaMessage = {
            ...message,
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId,
            correlationId: TracingUtils.createCorrelationId(),
          };

          span.setAttributes({
            'messaging.system': 'kafka',
            'messaging.destination': topic,
            'messaging.operation': 'publish',
            'messaging.kafka.topic': topic,
            'messaging.message.type': message.type,
            'messaging.message.id': (message as any).eventId || 'unknown',
            'messaging.message_payload_size_bytes': JSON.stringify(tracedMessage).length,
          });

          await this.kafkaClient.publish(topic, tracedMessage);

          const duration = Date.now() - startTime;

          this.tracingManager.traceKafkaOperation({
            topic,
            operation: 'produce',
            messageSize: JSON.stringify(tracedMessage).length,
            duration,
          });

          span.addEvent('message.published', {
            'message.size': JSON.stringify(tracedMessage).length,
            'message.type': message.type,
          });
        } catch (error: unknown) {
          if (error instanceof Error) {
            (span as any).recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });
          }
          throw error;
        }
      },
      { kind: SpanKind.PRODUCER }
    );
  }

  async publishBatch(topic: string, messages: IKafkaMessage[]): Promise<void> {
    return this.tracingManager.traceFunction(
      `Kafka Batch Produce ${topic}`,
      async (span: any) => {
        span.setAttributes({
          'messaging.system': 'kafka',
          'messaging.destination': topic,
          'messaging.operation': 'batch_publish',
          'messaging.batch.message_count': messages.length,
        });

        for (let i = 0; i < messages.length; i++) {
          const childSpan = this.tracingManager.startChildSpan(
            `Kafka Produce ${topic} [${i + 1}/${messages.length}]`,
            span
          );

          try {
            const msg = messages[i];
            if (msg) {
              await this.publish(topic, msg);
            }
            childSpan.setStatus({ code: SpanStatusCode.OK });
          } catch (error: unknown) {
            if (error instanceof Error) {
              childSpan.recordException(error);
              childSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
            }
            throw error;
          } finally {
            childSpan.end();
          }
        }
      },
      { kind: SpanKind.PRODUCER }
    );
  }
}

export class TracedKafkaConsumer {
  constructor(
    private kafkaClient: KafkaClient,
    private tracingManager: TracingManager
  ) {}

  async subscribe(
    topic: string,
    messageHandler: (message: ITracedKafkaMessage) => Promise<void>
  ): Promise<void> {
    const tracedHandler = async (message: IKafkaMessage) => {
      const tracedMessage = message as ITracedKafkaMessage;

      return this.tracingManager.traceFunction(
        `Kafka Consume ${topic}`,
        async (span: any) => {
          try {
            if (tracedMessage.traceId && tracedMessage.spanId) {
              span.setAttributes({
                'messaging.kafka.source_trace_id': tracedMessage.traceId,
                'messaging.kafka.source_span_id': tracedMessage.spanId,
                'messaging.kafka.correlation_id': tracedMessage.correlationId,
              });
            }

            span.setAttributes({
              'messaging.system': 'kafka',
              'messaging.source': topic,
              'messaging.operation': 'receive',
              'messaging.kafka.topic': topic,
              'messaging.message.type': tracedMessage.type,
              'messaging.message.id': (tracedMessage as any).eventId || 'unknown',
              'messaging.message_payload_size_bytes': JSON.stringify(tracedMessage).length,
            });

            span.addEvent('message.received', {
              'message.type': tracedMessage.type,
              'message.size': JSON.stringify(tracedMessage).length,
            });

            await messageHandler(tracedMessage);

            span.addEvent('message.processed');

            this.tracingManager.traceKafkaOperation({
              topic,
              operation: 'consume',
              messageSize: JSON.stringify(tracedMessage).length,
              duration: Date.now() - span.startTime,
            });
          } catch (error: unknown) {
            if (error instanceof Error) {
              (span as any).recordException(error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
            }
            throw error;
          }
        },
        { kind: SpanKind.CONSUMER }
      );
    };

    await this.kafkaClient.subscribe([topic], { [topic]: tracedHandler });
  }
}

export class TracedKafkaClientFactory {
  static createProducer(
    kafkaClient: KafkaClient,
    tracingManager: TracingManager
  ): TracedKafkaProducer {
    return new TracedKafkaProducer(kafkaClient, tracingManager);
  }

  static createConsumer(
    kafkaClient: KafkaClient,
    tracingManager: TracingManager
  ): TracedKafkaConsumer {
    return new TracedKafkaConsumer(kafkaClient, tracingManager);
  }

  static wrapKafkaClient(
    kafkaClient: KafkaClient,
    tracingManager: TracingManager
  ): TracedKafkaClient {
    return new TracedKafkaClient(kafkaClient, tracingManager);
  }
}

export class TracedKafkaClient {
  private producer: TracedKafkaProducer;
  private consumer: TracedKafkaConsumer;

  constructor(
    private kafkaClient: KafkaClient,
    private tracingManager: TracingManager
  ) {
    this.producer = new TracedKafkaProducer(kafkaClient, tracingManager);
    this.consumer = new TracedKafkaConsumer(kafkaClient, tracingManager);
  }

  async publish(topic: string, message: IKafkaMessage): Promise<void> {
    return this.producer.publish(topic, message);
  }

  async publishBatch(topic: string, messages: IKafkaMessage[]): Promise<void> {
    return this.producer.publishBatch(topic, messages);
  }

  async subscribe(
    topic: string,
    messageHandler: (message: ITracedKafkaMessage) => Promise<void>
  ): Promise<void> {
    return this.consumer.subscribe(topic, messageHandler);
  }

  async connect(): Promise<void> {
    return this.tracingManager.traceFunction('Kafka Connect', async () => {
      return this.kafkaClient.connect();
    });
  }

  async disconnect(): Promise<void> {
    return this.tracingManager.traceFunction('Kafka Disconnect', async () => {
      return this.kafkaClient.disconnect();
    });
  }

  getServiceName(): string {
    return this.kafkaClient.getServiceName();
  }
}

export const KafkaTracingUtils = {
  extractTraceContext(message: ITracedKafkaMessage): Record<string, unknown> | null {
    if (!message.traceId || !message.spanId) {
      return null;
    }

    return {
      traceId: message.traceId,
      spanId: message.spanId,
      parentSpanId: message.parentSpanId,
      correlationId: message.correlationId,
    };
  },

  createKafkaTraceContext(
    tracingManager: TracingManager,
    operation: string,
    topic: string
  ): Record<string, unknown> {
    const traceContext = tracingManager.getCurrentTraceContext();

    return {
      ...traceContext,
      operation: `kafka.${operation}.${topic}`,
      correlationId: TracingUtils.createCorrelationId(),
    };
  },

  formatKafkaTraceForLogs(message: ITracedKafkaMessage): Record<string, unknown> {
    return {
      traceId: message.traceId,
      spanId: message.spanId,
      correlationId: message.correlationId,
      messageType: message.type,
      messageId: (message as any).eventId,
    };
  },

  createTracingHeaders(tracingManager: TracingManager): Record<string, string> {
    const traceContext = tracingManager.getCurrentTraceContext();
    if (!traceContext) {
      return {};
    }

    return {
      'kafka-trace-id': traceContext.traceId,
      'kafka-span-id': traceContext.spanId,
      'kafka-service': traceContext.service,
      'kafka-correlation-id': TracingUtils.createCorrelationId(),
    };
  },
};
