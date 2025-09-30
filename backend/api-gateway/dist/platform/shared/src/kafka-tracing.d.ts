import { TracingManager } from './tracing';
import { KafkaClient, IKafkaMessage } from './kafka-client';
export interface ITracedKafkaMessage extends IKafkaMessage {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    correlationId?: string;
}
export declare class TracedKafkaProducer {
    private kafkaClient;
    private tracingManager;
    constructor(kafkaClient: KafkaClient, tracingManager: TracingManager);
    publish(topic: string, message: IKafkaMessage): Promise<void>;
    publishBatch(topic: string, messages: IKafkaMessage[]): Promise<void>;
}
export declare class TracedKafkaConsumer {
    private kafkaClient;
    private tracingManager;
    constructor(kafkaClient: KafkaClient, tracingManager: TracingManager);
    subscribe(topic: string, messageHandler: (message: ITracedKafkaMessage) => Promise<void>): Promise<void>;
}
export declare class TracedKafkaClientFactory {
    static createProducer(kafkaClient: KafkaClient, tracingManager: TracingManager): TracedKafkaProducer;
    static createConsumer(kafkaClient: KafkaClient, tracingManager: TracingManager): TracedKafkaConsumer;
    static wrapKafkaClient(kafkaClient: KafkaClient, tracingManager: TracingManager): TracedKafkaClient;
}
export declare class TracedKafkaClient {
    private kafkaClient;
    private tracingManager;
    private producer;
    private consumer;
    constructor(kafkaClient: KafkaClient, tracingManager: TracingManager);
    publish(topic: string, message: IKafkaMessage): Promise<void>;
    publishBatch(topic: string, messages: IKafkaMessage[]): Promise<void>;
    subscribe(topic: string, messageHandler: (message: ITracedKafkaMessage) => Promise<void>): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getServiceName(): string;
}
export declare const KafkaTracingUtils: {
    extractTraceContext(message: ITracedKafkaMessage): Record<string, unknown> | null;
    createKafkaTraceContext(tracingManager: TracingManager, operation: string, topic: string): Record<string, unknown>;
    formatKafkaTraceForLogs(message: ITracedKafkaMessage): Record<string, unknown>;
    createTracingHeaders(tracingManager: TracingManager): Record<string, string>;
};
//# sourceMappingURL=kafka-tracing.d.ts.map