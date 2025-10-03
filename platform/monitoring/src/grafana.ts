import express from 'express';
import { PrometheusMetrics } from './prometheus';

export class GrafanaDashboard {
  private app: express.Application;
  private metrics: PrometheusMetrics;

  constructor() {
    this.app = express();
    this.metrics = PrometheusMetrics.getInstance();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.get('/metrics', async (_req, res) => {
      try {
        const metrics = await this.metrics.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/dashboard', (_req, res) => {
      res.json({
        title: 'Science Map Platform Dashboard',
        panels: [
          {
            title: 'HTTP Requests',
            type: 'graph',
            targets: [
              { expr: 'rate(http_requests_total[5m])', legendFormat: '{{method}} {{route}}' }
            ]
          },
          {
            title: 'Response Time',
            type: 'graph',
            targets: [
              { expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))', legendFormat: '95th percentile' }
            ]
          },
          {
            title: 'Active Connections',
            type: 'singlestat',
            targets: [
              { expr: 'active_connections', legendFormat: 'Active Connections' }
            ]
          },
          {
            title: 'Memory Usage',
            type: 'graph',
            targets: [
              { expr: 'memory_usage_bytes', legendFormat: '{{type}}' }
            ]
          }
        ]
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public start(port: number = 3000): void {
    this.app.listen(port, () => {
      // Grafana dashboard server started
    });
  }
}
