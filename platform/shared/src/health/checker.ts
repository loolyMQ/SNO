import pino from 'pino';
import { HealthCheckResult, ServiceHealthCheck, HealthCheckConfig } from './types';

const logger = pino({
    level: process.env['LOG_LEVEL'] || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});

export class HealthChecker {
    private config: HealthCheckConfig;
    private checks = new Map<string, () => Promise<ServiceHealthCheck>>();
    private startTime: number;

    constructor(config: Partial<HealthCheckConfig> = {}) {
        this.config = {
            timeout: 5000,
            interval: 30000,
            retries: 3,
            criticalChecks: ['database', 'redis'],
            warningChecks: ['kafka', 'external-services'],
            ...config,
        };
        this.startTime = Date.now();
    }

    addCheck(name: string, checkFn: () => Promise<ServiceHealthCheck>): void {
        this.checks.set(name, checkFn);
    }

    async performHealthCheck(): Promise<HealthCheckResult> {
        const checks: ServiceHealthCheck[] = [];
        const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
            try {
                const result = await Promise.race([
                    checkFn(),
                    new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
                    ),
                ]);
                if (!result) {
                    throw new Error('Health check returned undefined');
                }
                checks.push(result);
            } catch (error) {
                logger.error(`Health check failed for ${name}:`, error);
                checks.push({
                    name,
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : String(error),
                    lastCheck: Date.now(),
                });
            }
        });

        await Promise.all(checkPromises);

        const overallStatus = this.determineOverallStatus(checks);
        const uptime = Date.now() - this.startTime;

        return {
            status: overallStatus,
            timestamp: Date.now(),
            uptime,
            checks,
            version: process.env['SERVICE_VERSION'] || '1.0.0',
            environment: process.env['NODE_ENV'] || 'development',
        };
    }

    private determineOverallStatus(checks: ServiceHealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
        const criticalChecks = checks.filter(check => 
            this.config.criticalChecks?.includes(check.name)
        );
        const warningChecks = checks.filter(check => 
            this.config.warningChecks?.includes(check.name)
        );

        const hasUnhealthyCritical = criticalChecks.some(check => check.status === 'unhealthy');
        const hasUnhealthyWarning = warningChecks.some(check => check.status === 'unhealthy');

        if (hasUnhealthyCritical) {
            return 'unhealthy';
        }
        if (hasUnhealthyWarning) {
            return 'degraded';
        }
        return 'healthy';
    }

    async startPeriodicChecks(): Promise<void> {
        setInterval(async () => {
            try {
                const result = await this.performHealthCheck();
                logger.info('Periodic health check completed:', {
                    status: result.status,
                    checksCount: result.checks.length,
                });
            } catch (error) {
                logger.error('Periodic health check failed:', error);
            }
        }, this.config.interval);
    }
}
