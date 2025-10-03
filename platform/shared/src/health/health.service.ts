import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

@injectable()
export class HealthService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private startTime: Date;

  constructor(
    private _logger: LoggerService,
    private _metrics: MetricsService
  ) {
    this.startTime = new Date();
    this._logger.info('HealthService initialized');
  }

  public registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn);
    this._logger.debug(`Health check registered: ${name}`);
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const [name, checkFn] of this.checks) {
      try {
        const check = await checkFn();
        if (!check) {
          throw new Error(`Health check ${name} returned undefined`);
        }
        checks.push(check);
        
        if (check.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (check.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        const failedCheck: HealthCheck = {
          name,
          status: 'unhealthy',
          message: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date()
        };
        checks.push(failedCheck);
        overallStatus = 'unhealthy';
      }
    }

    const status: HealthStatus = {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    this._metrics.incrementCounter('health_checks_total', { status: overallStatus });
    
    return status;
  }

  public async isHealthy(): Promise<boolean> {
    const status = await this.getHealthStatus();
    if (!status) {
      return false;
    }
    return status.status === 'healthy';
  }

  public async isReady(): Promise<boolean> {
    const status = await this.getHealthStatus();
    if (!status) {
      return false;
    }
    return status.status === 'healthy' || status.status === 'degraded';
  }
}
