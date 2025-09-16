import { KafkaEvent, ServiceConfig } from '../types';
export declare class KafkaClient {
  private kafka;
  private producer;
  private consumer;
  private config;
  constructor(config: ServiceConfig);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publishEvent(topic: string, event: KafkaEvent): Promise<void>;
  subscribeToTopic(topic: string, handler: (event: KafkaEvent) => Promise<void>): Promise<void>;
}
export declare function createKafkaClient(config: ServiceConfig): KafkaClient;
//# sourceMappingURL=client.d.ts.map
