export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: number;
    uptime: number;
    version: string;
    environment: string;
    checks: ServiceHealthCheck[];
    metadata?: Record<string, unknown>;
}

export interface ServiceHealthCheck {
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime?: number;
    lastCheck?: number;
    error?: string;
    details?: Record<string, unknown>;
}

export interface HealthCheckConfig {
    timeout: number;
    interval: number;
    retries: number;
    criticalChecks: string[];
    warningChecks: string[];
}

export interface DatabaseHealthCheck extends ServiceHealthCheck {
    name: 'database';
    connectionPool: {
        active: number;
        idle: number;
        total: number;
    };
    queries: {
        total: number;
        slow: number;
        errors: number;
    };
}

export interface RedisHealthCheck extends ServiceHealthCheck {
    name: 'redis';
    memory: {
        used: number;
        peak: number;
        fragmentation: number;
    };
    operations: {
        total: number;
        errors: number;
    };
}

export interface KafkaHealthCheck extends ServiceHealthCheck {
    name: 'kafka';
    brokers: {
        connected: number;
        total: number;
    };
    topics: {
        available: number;
        total: number;
    };
    consumerLag: number;
}

export interface ExternalServiceHealthCheck extends ServiceHealthCheck {
    name: string;
    url: string;
    responseTime: number;
    statusCode?: number;
}
