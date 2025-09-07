// Главный экспорт для @platform/monitoring пакета

export * from './types';
export * from './metrics';
export * from './tracing';
export * from './health';
export * from './middleware/express';
export * from './server/metrics-server';
export * from './config/prometheus-config';

import { MetricsCollector, HttpMetrics, DatabaseMetrics } from './metrics';
import { TracingManager, CustomTracing } from './tracing';
import { HealthChecker, DatabaseHealthCheck, ExternalServiceHealthCheck } from './health';
import { MonitoringConfig } from './types';

export class MonitoringService {
  private metricsCollector: MetricsCollector;
  private tracingManager: TracingManager;
  private healthChecker: HealthChecker;
  private customTracing: CustomTracing;
  
  public httpMetrics: HttpMetrics;
  public databaseMetrics: DatabaseMetrics;

  constructor(config: MonitoringConfig) {
    
    // Инициализация компонентов
    this.metricsCollector = new MetricsCollector(config);
    this.tracingManager = new TracingManager(config);
    this.healthChecker = new HealthChecker(config.serviceName, config.serviceVersion);
    this.customTracing = new CustomTracing(config.serviceName);
    
    // Инициализация предустановленных метрик
    this.httpMetrics = new HttpMetrics(this.metricsCollector);
    this.databaseMetrics = new DatabaseMetrics(this.metricsCollector);
  }

  // Инициализация мониторинга
  async initialize(): Promise<void> {
    // Инициализация трейсинга
    this.tracingManager.initialize();
    
    // Настройка health checks для стандартных сервисов
    this.setupDefaultHealthChecks();
  }

  // Настройка стандартных health checks
  private setupDefaultHealthChecks(): void {
    // PostgreSQL
    if (process.env['DATABASE_URL']) {
      this.healthChecker.addDependency('postgresql', () => 
        DatabaseHealthCheck.checkPostgreSQL(process.env['DATABASE_URL']!)
      );
    }

    // Redis
    if (process.env['REDIS_URL']) {
      const redisUrl = new URL(process.env['REDIS_URL']);
      this.healthChecker.addDependency('redis', () => 
        DatabaseHealthCheck.checkRedis(redisUrl.hostname, parseInt(redisUrl.port))
      );
    }

    // Meilisearch
    if (process.env['MEILISEARCH_URL']) {
      this.healthChecker.addDependency('meilisearch', () => 
        ExternalServiceHealthCheck.checkMeilisearch(process.env['MEILISEARCH_URL']!)
      );
    }

    // RabbitMQ
    if (process.env['RABBITMQ_URL']) {
      const rabbitUrl = new URL(process.env['RABBITMQ_URL']);
      this.healthChecker.addDependency('rabbitmq', () => 
        ExternalServiceHealthCheck.checkRabbitMQ(rabbitUrl.hostname, parseInt(rabbitUrl.port))
      );
    }
  }

  // Получение метрик
  async getMetrics(): Promise<string> {
    return this.metricsCollector.getMetrics();
  }

  // Получение health check
  async getHealth(): Promise<any> {
    return this.healthChecker.checkHealth();
  }

  // Проверка критического здоровья
  async isHealthy(): Promise<boolean> {
    return this.healthChecker.checkCriticalHealth();
  }

  // Создание кастомных метрик
  createCounter(name: string, help: string, labels?: string[]) {
    return this.metricsCollector.createCounter(name, help, labels);
  }

  createGauge(name: string, help: string, labels?: string[]) {
    return this.metricsCollector.createGauge(name, help, labels);
  }

  createHistogram(name: string, help: string, labels?: string[], buckets?: number[]) {
    return this.metricsCollector.createHistogram(name, help, labels, buckets);
  }

  createSummary(name: string, help: string, labels?: string[]) {
    return this.metricsCollector.createSummary(name, help, labels);
  }

  // Создание кастомных спанов
  createBusinessSpan(operationName: string, attributes?: Record<string, any>) {
    return this.customTracing.createBusinessSpan(operationName, attributes);
  }

  createExternalCallSpan(serviceName: string, operation: string, attributes?: Record<string, any>) {
    return this.customTracing.createExternalCallSpan(serviceName, operation, attributes);
  }

  createErrorSpan(operationName: string, error: Error, attributes?: Record<string, any>) {
    return this.customTracing.createErrorSpan(operationName, error, attributes);
  }

  // Завершение работы
  async shutdown(): Promise<void> {
    await this.tracingManager.shutdown();
  }
}

// Фабрика для создания мониторинга
export function createMonitoring(config: MonitoringConfig): MonitoringService {
  return new MonitoringService(config);
}

// Глобальный экземпляр мониторинга
let globalMonitoring: MonitoringService | null = null;

export function getMonitoring(): MonitoringService {
  if (!globalMonitoring) {
    throw new Error('Monitoring not initialized. Call setGlobalMonitoring first.');
  }
  return globalMonitoring;
}

export function setGlobalMonitoring(monitoring: MonitoringService): void {
  globalMonitoring = monitoring;
}

// Утилиты для быстрого доступа
export function getMetrics(): Promise<string> {
  return getMonitoring().getMetrics();
}

export function getHealth(): Promise<any> {
  return getMonitoring().getHealth();
}

export function isHealthy(): Promise<boolean> {
  return getMonitoring().isHealthy();
}
