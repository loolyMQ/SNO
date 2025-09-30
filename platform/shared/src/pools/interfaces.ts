// import pino from 'pino';

export interface IConnectionPoolConfig {
  name: string;
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  maxRetries: number;
  enableHealthCheck: boolean;
  healthCheckIntervalMs: number;
}

export interface IConnectionPool<T> {
  acquire(): Promise<T>;
  release(connection: T): Promise<void>;
  destroy(connection: T): Promise<void>;
  getStats(): IPoolStats;
  healthCheck(): Promise<boolean>;
  drain(): Promise<void>;
  clear(): Promise<void>;
}

export interface IPoolStats {
  size: number;
  available: number;
  borrowed: number;
  pending: number;
  max: number;
  min: number;
}
