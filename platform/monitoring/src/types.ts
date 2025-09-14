export interface MonitoringConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  prometheusPort?: number;
  metricsPath?: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}
