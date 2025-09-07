import { createServer, Server } from 'http';
import { MonitoringService } from '../index';

export class MetricsServer {
  private server: Server | null = null;
  private monitoringService: MonitoringService;
  private port: number;

  constructor(monitoringService: MonitoringService, port: number = 9091) {
    this.monitoringService = monitoringService;
    this.port = port;
  }

  // Запуск сервера метрик
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(async (req, res) => {
        try {
          if (req.url === '/metrics') {
            // Устанавливаем заголовки для Prometheus
            res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            
            // Получаем метрики
            const metrics = await this.monitoringService.getMetrics();
            res.statusCode = 200;
            res.end(metrics);
          } else if (req.url === '/health') {
            // Health check endpoint
            const health = await this.monitoringService.getHealth();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(health, null, 2));
          } else if (req.url === '/ready') {
            // Readiness check endpoint
            const isHealthy = await this.monitoringService.isHealthy();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = isHealthy ? 200 : 503;
            res.end(JSON.stringify({ 
              status: isHealthy ? 'ready' : 'not ready',
              timestamp: new Date().toISOString()
            }));
          } else {
            // 404 для других маршрутов
            res.statusCode = 404;
            res.end('Not Found');
          }
        } catch (error) {
          console.error('Error in metrics server:', error);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });

      this.server.listen(this.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Metrics server started on port ${this.port}`);
          console.log(`Metrics endpoint: http://localhost:${this.port}/metrics`);
          console.log(`Health endpoint: http://localhost:${this.port}/health`);
          console.log(`Readiness endpoint: http://localhost:${this.port}/ready`);
          resolve();
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());
    });
  }

  // Остановка сервера
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Metrics server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Получение информации о сервере
  getInfo() {
    return {
      port: this.port,
      running: this.server !== null,
      endpoints: {
        metrics: `http://localhost:${this.port}/metrics`,
        health: `http://localhost:${this.port}/health`,
        ready: `http://localhost:${this.port}/ready`,
      }
    };
  }
}
