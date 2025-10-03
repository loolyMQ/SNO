export interface ServiceConfig {
  port: number;
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
}
