import { HealthCheck, ServiceHealth } from '../types';

export class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private startTime: Date = new Date();

  registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn);
  }

  async getHealth(): Promise<ServiceHealth> {
    const checks: HealthCheck[] = [];
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const [name, checkFn] of this.checks) {
      try {
        const check = await checkFn();
        checks.push(check);
        
        if (check.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (check.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks.push({
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}

// Стандартные проверки здоровья
export const createDatabaseHealthCheck = (connectionFn: () => Promise<boolean>) => 
  async (): Promise<HealthCheck> => {
    try {
      const isConnected = await connectionFn();
      return {
        name: 'database',
        status: isConnected ? 'healthy' : 'unhealthy',
        message: isConnected ? 'Database connection is healthy' : 'Database connection failed',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database check failed',
        timestamp: new Date(),
      };
    }
  };

export const createKafkaHealthCheck = (kafkaClient: any) =>
  async (): Promise<HealthCheck> => {
    try {
      // Проверяем подключение к Kafka
      const isConnected = kafkaClient && kafkaClient.isConnected?.();
      return {
        name: 'kafka',
        status: isConnected ? 'healthy' : 'unhealthy',
        message: isConnected ? 'Kafka connection is healthy' : 'Kafka connection failed',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'kafka',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Kafka check failed',
        timestamp: new Date(),
      };
    }
  };
