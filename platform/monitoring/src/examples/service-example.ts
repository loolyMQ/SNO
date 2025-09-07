// Пример использования мониторинга в сервисе

import express from 'express';
import { 
  createMonitoring, 
  createServiceMonitoringConfig,
  ExpressMonitoringMiddleware,
  MetricsServer 
} from '../index';

// Инициализация мониторинга для сервиса
async function initializeMonitoring(serviceName: string) {
  // Создаем конфигурацию для сервиса
  const config = createServiceMonitoringConfig(serviceName);
  
  // Создаем экземпляр мониторинга
  const monitoring = createMonitoring(config);
  
  // Инициализируем мониторинг
  await monitoring.initialize();
  
  // Запускаем сервер метрик
  const metricsServer = new MetricsServer(monitoring, config.metrics.port);
  await metricsServer.start();
  
  return { monitoring, metricsServer };
}

// Пример Express приложения с мониторингом
export async function createMonitoredExpressApp(serviceName: string): Promise<{ app: any; monitoring: any }> {
  const app = express();
  
  // Инициализируем мониторинг
  const { monitoring } = await initializeMonitoring(serviceName);
  
  // Создаем middleware для мониторинга
  const monitoringMiddleware = new ExpressMonitoringMiddleware(monitoring.httpMetrics);
  
  // Добавляем middleware для отслеживания времени начала запроса
  app.use((req, res, next) => {
    (req as any).startTime = Date.now();
    next();
  });
  
  // Добавляем middleware для мониторинга HTTP запросов
  app.use(monitoringMiddleware.requestMiddleware());
  
  // Добавляем middleware для обработки ошибок
  app.use(monitoringMiddleware.errorMiddleware());
  
  // Пример маршрута
  app.get('/api/health', async (req, res) => {
    try {
      const health = await monitoring.getHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  });
  
  // Пример маршрута с бизнес-логикой
  app.get('/api/data', async (req, res) => {
    // Создаем span для бизнес-логики
    const span = monitoring.createBusinessSpan('get-data', {
      'user.id': req.headers['user-id'] as string,
      'request.source': 'api'
    });
    
    try {
      // Имитируем работу с базой данных
      const dbSpan = monitoring.createExternalCallSpan('database', 'query', {
        'db.table': 'users',
        'db.operation': 'select'
      });
      
      // Имитируем запрос к базе данных
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Записываем метрики для базы данных
      monitoring.databaseMetrics.recordQuery('select', 'users', 0.1, 'success');
      
      dbSpan.end();
      
      // Имитируем обработку данных
      await new Promise(resolve => setTimeout(resolve, 50));
      
      res.json({ 
        data: 'example data',
        timestamp: new Date().toISOString()
      });
      
      span.end();
    } catch (error) {
      // Создаем span для ошибки
      const errorSpan = monitoring.createErrorSpan('get-data-error', error as Error, {
        'user.id': req.headers['user-id'] as string
      });
      
      // Записываем метрики для ошибки
      monitoring.databaseMetrics.recordQuery('select', 'users', 0.1, 'error');
      
      errorSpan.end();
      span.end();
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  return { app, monitoring };
}

// Пример использования в main файле сервиса
export async function startService(serviceName: string, port: number) {
  try {
    // Создаем приложение с мониторингом
    const { app, monitoring } = await createMonitoredExpressApp(serviceName);
    
    // Запускаем сервер
    app.listen(port, () => {
      console.log(`${serviceName} started on port ${port}`);
      console.log(`Metrics available at http://localhost:${monitoring.getMetrics()}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down gracefully...');
      await monitoring.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Пример для запуска сервиса
if (require.main === module) {
  const serviceName = process.env.SERVICE_NAME || 'example-service';
  const port = parseInt(process.env.PORT || '3000');
  
  startService(serviceName, port);
}
