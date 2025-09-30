export * from './kafka-client';
export * from './events';
export * from './redis-client';
export * from './database-indexes';
export * from './dependency-injection';
export * from './tracing';
export * from './kafka-tracing';
export * from './database-tracing';
export * from './pools';
export * from './pool-monitor';
export * from './query-optimizer';
export * from './errors';
export * from './validation';
export * from './observability';
export * from './feature-flags';
export * from './backup';
export * from './secrets';
export * from './caching';
export * from './versioning';
export * from './contracts';
// export * from './deployment';
export * from './health';
export * from './security';
export * from './monitoring';
export * from './database-indexes';
export * from './query-optimizer';
export * from './retry';
export * from './logging';
export * from './middleware';
export * from './middleware/centralized-version-middleware';
export * from './dependencies';

export interface ServiceConfig {
  port: number;
  kafka: {
    brokers: string[];
  };
  redis: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
}

export const utils = {
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0] || '';
  },
  generateId: (): string => {
    return Math.random().toString(36).substr(2, 9);
  },
  generateCorrelationId: (): string => {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
