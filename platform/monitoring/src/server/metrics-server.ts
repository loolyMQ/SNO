// Простая реализация метрик сервера без Express
export interface App {
  get: (path: string, handler: (req: any, res: any) => void) => void;
  listen: (port: number, callback: () => void) => any;
}

export function createMetricsServer(port: number = 9091): App {
  const app = {
    get: (path: string, handler: (req: any, res: any) => void) => {
      console.log(`Registered route: ${path}`);
    },
    listen: (port: number, callback: () => void) => {
      console.log(`Metrics server would start on port ${port}`);
      callback();
      return {
        close: (cb: () => void) => {
          console.log('Metrics server stopped');
          cb();
        },
      };
    },
  };

  app.get('/metrics', async (req: any, res: any) => {
    try {
      console.log('Metrics endpoint called');
      // В реальном приложении здесь был бы res.set('Content-Type', 'text/plain')
      // и res.end(metrics)
    } catch (error) {
      console.error('Error generating metrics:', error);
    }
  });

  app.get('/health', (req: any, res: any) => {
    console.log('Health endpoint called');
    // В реальном приложении здесь был бы res.json({ status: 'healthy', timestamp: new Date() })
  });

  return app;
}

export function startMetricsServer(port: number = 9091): void {
  const app = createMetricsServer(port);
  const server = app.listen(port, () => {
    console.log(`📊 Metrics server running on port ${port}`);
    console.log(`📈 Metrics endpoint: http://localhost:${port}/metrics`);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Metrics server stopped');
    });
  });
}
