import { TracingUtils } from './tracing';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
export class TracedKafkaProducer {
    kafkaClient;
    tracingManager;
    constructor(kafkaClient, tracingManager) {
        this.kafkaClient = kafkaClient;
        this.tracingManager = tracingManager;
    }
    async publish(topic, message) {
        const startTime = Date.now();
        return this.tracingManager.traceFunction(`Kafka Produce ${topic}`, async (span) => {
            try {
                const tracedMessage = {
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
                    'messaging.message.id': message.eventId || 'unknown',
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
            }
            catch (error) {
                if (error instanceof Error) {
                    span.recordException(error);
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error instanceof Error ? error.message : String(error),
                    });
                }
                throw error;
            }
        }, { kind: SpanKind.PRODUCER });
    }
    async publishBatch(topic, messages) {
        return this.tracingManager.traceFunction(`Kafka Batch Produce ${topic}`, async (span) => {
            span.setAttributes({
                'messaging.system': 'kafka',
                'messaging.destination': topic,
                'messaging.operation': 'batch_publish',
                'messaging.batch.message_count': messages.length,
            });
            for (let i = 0; i < messages.length; i++) {
                const childSpan = this.tracingManager.startChildSpan(`Kafka Produce ${topic} [${i + 1}/${messages.length}]`, span);
                try {
                    const msg = messages[i];
                    if (msg) {
                        await this.publish(topic, msg);
                    }
                    childSpan.setStatus({ code: SpanStatusCode.OK });
                }
                catch (error) {
                    if (error instanceof Error) {
                        childSpan.recordException(error);
                        childSpan.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: error instanceof Error ? error.message : String(error),
                        });
                    }
                    throw error;
                }
                finally {
                    childSpan.end();
                }
            }
        }, { kind: SpanKind.PRODUCER });
    }
}
export class TracedKafkaConsumer {
    kafkaClient;
    tracingManager;
    constructor(kafkaClient, tracingManager) {
        this.kafkaClient = kafkaClient;
        this.tracingManager = tracingManager;
    }
    async subscribe(topic, messageHandler) {
        const tracedHandler = async (message) => {
            const tracedMessage = message;
            return this.tracingManager.traceFunction(`Kafka Consume ${topic}`, async (span) => {
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
                        'messaging.message.id': tracedMessage.eventId || 'unknown',
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
                }
                catch (error) {
                    if (error instanceof Error) {
                        span.recordException(error);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: error instanceof Error ? error.message : String(error),
                        });
                    }
                    throw error;
                }
            }, { kind: SpanKind.CONSUMER });
        };
        await this.kafkaClient.subscribe([topic], { [topic]: tracedHandler });
    }
}
export class TracedKafkaClientFactory {
    static createProducer(kafkaClient, tracingManager) {
        return new TracedKafkaProducer(kafkaClient, tracingManager);
    }
    static createConsumer(kafkaClient, tracingManager) {
        return new TracedKafkaConsumer(kafkaClient, tracingManager);
    }
    static wrapKafkaClient(kafkaClient, tracingManager) {
        return new TracedKafkaClient(kafkaClient, tracingManager);
    }
}
export class TracedKafkaClient {
    kafkaClient;
    tracingManager;
    producer;
    consumer;
    constructor(kafkaClient, tracingManager) {
        this.kafkaClient = kafkaClient;
        this.tracingManager = tracingManager;
        this.producer = new TracedKafkaProducer(kafkaClient, tracingManager);
        this.consumer = new TracedKafkaConsumer(kafkaClient, tracingManager);
    }
    async publish(topic, message) {
        return this.producer.publish(topic, message);
    }
    async publishBatch(topic, messages) {
        return this.producer.publishBatch(topic, messages);
    }
    async subscribe(topic, messageHandler) {
        return this.consumer.subscribe(topic, messageHandler);
    }
    async connect() {
        return this.tracingManager.traceFunction('Kafka Connect', async () => {
            return this.kafkaClient.connect();
        });
    }
    async disconnect() {
        return this.tracingManager.traceFunction('Kafka Disconnect', async () => {
            return this.kafkaClient.disconnect();
        });
    }
    getServiceName() {
        return this.kafkaClient.getServiceName();
    }
}
export const KafkaTracingUtils = {
    extractTraceContext(message) {
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
    createKafkaTraceContext(tracingManager, operation, topic) {
        const traceContext = tracingManager.getCurrentTraceContext();
        return {
            ...traceContext,
            operation: `kafka.${operation}.${topic}`,
            correlationId: TracingUtils.createCorrelationId(),
        };
    },
    formatKafkaTraceForLogs(message) {
        return {
            traceId: message.traceId,
            spanId: message.spanId,
            correlationId: message.correlationId,
            messageType: message.type,
            messageId: message.eventId,
        };
    },
    createTracingHeaders(tracingManager) {
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
//# sourceMappingURL=kafka-tracing.js.map