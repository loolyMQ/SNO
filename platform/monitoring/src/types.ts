// Типы для системы мониторинга

export interface MonitoringConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  
  // Метрики
  metrics: {
    enabled: boolean;
    port: number;
    endpoint: string;
    collectDefaultMetrics: boolean;
  };
  
  // Трейсинг
  tracing: {
    enabled: boolean;
    exporter: 'jaeger' | 'zipkin' | 'console';
    jaeger?: {
      endpoint: string;
    };
    zipkin?: {
      url: string;
    };
  };
  
  // Инструментация
  instrumentation: {
    http: boolean;
    express: boolean;
    fs: boolean;
    dns: boolean;
    net: boolean;
    pg: boolean;
    redis: boolean;
  };
}

export interface MetricLabels {
  [key: string]: string | number;
}

export interface MetricValue {
  value: number;
  labels?: MetricLabels;
  timestamp?: number;
}

export interface CustomMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: string[];
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  dependencies: Record<string, {
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    lastCheck: number;
  }>;
}
