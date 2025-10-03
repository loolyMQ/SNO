import express from 'express';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, {
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    message?: string;
  }>;
}

export class HealthChecker {
  private app: express.Application;
  private checks: Map<string, () => Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>>;

  constructor() {
    this.app = express();
    this.checks = new Map();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.get('/health', async (_req, res) => {
      const startTime = Date.now();
      const result = await this.performHealthCheck();
      const responseTime = Date.now() - startTime;

      const statusCode = result.status === 'healthy' ? 200 : 
                        result.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        ...result,
        responseTime
      });
    });

    this.app.get('/health/ready', async (_req, res) => {
      const result = await this.performHealthCheck();
      const isReady = result.status === 'healthy' || result.status === 'degraded';
      res.status(isReady ? 200 : 503).json({ ready: isReady });
    });

    this.app.get('/health/live', (_req, res) => {
      res.json({ alive: true, timestamp: new Date().toISOString() });
    });
  }

  public addCheck(name: string, checkFn: () => Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>): void {
    this.checks.set(name, checkFn);
  }

  private async performHealthCheck(): Promise<HealthCheckResult> {
    const checkResults: Record<string, { status: 'healthy' | 'unhealthy'; responseTime: number; message?: string }> = {};
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let unhealthyCount = 0;

    for (const [name, checkFn] of this.checks) {
      const checkStartTime = Date.now();
      try {
        const result = await checkFn();
        const responseTime = Date.now() - checkStartTime;
        
        checkResults[name] = {
          status: result.status,
          responseTime,
          ...(result.message && { message: result.message })
        };

        if (result.status === 'unhealthy') {
          unhealthyCount++;
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        const responseTime = Date.now() - checkStartTime;
        checkResults[name] = {
          status: 'unhealthy',
          responseTime,
          message: error instanceof Error ? error.message : 'Unknown error'
        };
        unhealthyCount++;
        overallStatus = 'unhealthy';
      }
    }

    if (unhealthyCount > 0 && unhealthyCount < this.checks.size) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      checks: checkResults
    };
  }

  public getApp(): express.Application {
    return this.app;
  }

  public start(port: number = 8080): void {
    this.app.listen(port, () => {
      // Health check server started
    });
  }
}
