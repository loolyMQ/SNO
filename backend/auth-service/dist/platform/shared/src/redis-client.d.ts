import Redis from 'ioredis';
export interface ICacheConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    defaultTTL: number;
    maxRetries: number;
    retryDelayOnFailover?: number;
}
export interface ICacheEntry<T = any> {
    value: T;
    timestamp: number;
    ttl: number;
    key: string;
}
export declare class RedisClient {
    private client;
    private config;
    private isConnected;
    private serviceName;
    constructor(serviceName: string, config?: Partial<ICacheConfig>);
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    setex<T>(key: string, seconds: number, value: T): Promise<void>;
    increment(key: string, by?: number): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    flushNamespace(): Promise<void>;
    mget<T>(keys: string[]): Promise<(T | null)[]>;
    cached<T>(key: string, fetchFunction: () => Promise<T>, ttl?: number): Promise<T>;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        details: {
            connected: boolean;
            latency?: number;
            memory?: Record<string, unknown>;
            error?: string;
        };
    }>;
    getConfig(): ICacheConfig;
    isReady(): boolean;
    getServiceName(): string;
    getClient(): Redis;
}
export declare const createRedisClient: (serviceName: string, config?: Partial<ICacheConfig>) => RedisClient;
//# sourceMappingURL=redis-client.d.ts.map