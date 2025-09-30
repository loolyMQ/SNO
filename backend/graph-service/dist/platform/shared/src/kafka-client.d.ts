export interface IKafkaMessage {
    type: string;
    payload: unknown;
    correlationId?: string;
    userId?: string;
    timestamp?: number;
    source: string;
}
export declare class KafkaClient {
    private kafka;
    private producer;
    private consumer;
    private serviceName;
    private isConnected;
    constructor(serviceName: string, brokers?: string[]);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    publish(topic: string, message: Omit<IKafkaMessage, 'timestamp' | 'source'>): Promise<void>;
    subscribe(topics: string[], handlers: Record<string, (message: IKafkaMessage) => Promise<void>>): Promise<void>;
    isReady(): boolean;
    getServiceName(): string;
}
export declare const createKafkaClient: (serviceName: string) => KafkaClient;
//# sourceMappingURL=kafka-client.d.ts.map