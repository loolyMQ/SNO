import { MonitoringConfig } from '../types';

// Базовая конфигурация для Prometheus
export const defaultPrometheusConfig = {
  // Интервал сбора метрик
  scrapeInterval: '15s',
  
  // Таймаут для запросов
  scrapeTimeout: '10s',
  
  // Правила оценки
  evaluationInterval: '15s',
  
  // Конфигурация для каждого сервиса
  services: {
    'api-gateway': {
      port: 3001,
      metricsPort: 9091,
      path: '/metrics'
    },
    'auth-service': {
      port: 3002,
      metricsPort: 9092,
      path: '/metrics'
    },
    'graph-service': {
      port: 3003,
      metricsPort: 9093,
      path: '/metrics'
    },
    'jobs-service': {
      port: 3004,
      metricsPort: 9094,
      path: '/metrics'
    },
    'search-service': {
      port: 3005,
      metricsPort: 9095,
      path: '/metrics'
    }
  }
};

// Генерация конфигурации Prometheus
export function generatePrometheusConfig(services: string[] = []): string {
  const config = {
    global: {
      scrape_interval: defaultPrometheusConfig.scrapeInterval,
      evaluation_interval: defaultPrometheusConfig.evaluationInterval,
    },
    rule_files: [
      // 'rules/*.yml'
    ],
    scrape_configs: [
      // Prometheus сам себя
      {
        job_name: 'prometheus',
        static_configs: [
          { targets: ['localhost:9090'] }
        ]
      },
      // Каждый сервис
      ...services.map(serviceName => {
        const serviceConfig = defaultPrometheusConfig.services[serviceName as keyof typeof defaultPrometheusConfig.services];
        if (!serviceConfig) return null;
        
        return {
          job_name: serviceName,
          static_configs: [
            { targets: [`${serviceName}:${serviceConfig.metricsPort}`] }
          ],
          metrics_path: serviceConfig.path,
          scrape_interval: defaultPrometheusConfig.scrapeInterval,
          scrape_timeout: defaultPrometheusConfig.scrapeTimeout,
        };
      }).filter(Boolean),
      
      // Инфраструктурные сервисы
      {
        job_name: 'postgres',
        static_configs: [
          { targets: ['postgres:5432'] }
        ]
      },
      {
        job_name: 'redis',
        static_configs: [
          { targets: ['redis:6379'] }
        ]
      },
      {
        job_name: 'rabbitmq',
        static_configs: [
          { targets: ['rabbitmq:15672'] }
        ],
        metrics_path: '/metrics'
      },
      {
        job_name: 'meilisearch',
        static_configs: [
          { targets: ['meilisearch:7700'] }
        ],
        metrics_path: '/metrics'
      }
    ]
  };

  return `# Prometheus configuration for Science Map project
# Generated automatically

global:
  scrape_interval: ${config.global.scrape_interval}
  evaluation_interval: ${config.global.evaluation_interval}

rule_files:
${config.rule_files.map(file => `  - ${file}`).join('\n')}

scrape_configs:
${config.scrape_configs.map(job => {
  if (!job) return '';
  return `  - job_name: '${job.job_name}'
    static_configs:
      - targets: ${JSON.stringify(job.static_configs[0]?.targets || [])}
${(job as any).metrics_path ? `    metrics_path: '${(job as any).metrics_path}'` : ''}
${(job as any).scrape_interval ? `    scrape_interval: '${(job as any).scrape_interval}'` : ''}
${(job as any).scrape_timeout ? `    scrape_timeout: '${(job as any).scrape_timeout}'` : ''}`;
}).join('\n\n')}
`;
}

// Создание конфигурации для конкретного сервиса
export function createServiceMonitoringConfig(serviceName: string): MonitoringConfig {
  const serviceConfig = defaultPrometheusConfig.services[serviceName as keyof typeof defaultPrometheusConfig.services];
  
  if (!serviceConfig) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  return {
    serviceName,
    serviceVersion: '1.0.0',
    environment: (process.env.NODE_ENV as any) || 'development',
    
    metrics: {
      enabled: true,
      port: serviceConfig.metricsPort,
      endpoint: '/metrics',
      collectDefaultMetrics: true,
    },
    
    tracing: {
      enabled: process.env.NODE_ENV !== 'production',
      exporter: 'console',
    },
    
    instrumentation: {
      http: true,
      express: true,
      fs: false,
      dns: false,
      net: false,
      pg: true,
      redis: true,
    },
  };
}
