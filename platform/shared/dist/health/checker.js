import pino from 'pino';
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
    config;
    checks = new Map();
    startTime;
    constructor(config = {}) {
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
    addCheck(name, checkFn) {
        this.checks.set(name, checkFn);
    }
    async performHealthCheck() {
        const checks = [];
        const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
            try {
                const result = await Promise.race([
                    checkFn(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)),
                ]);
                checks.push(result);
            }
            catch (error) {
                logger.error(`Health check failed for ${name}:`, error);
                checks.push({
                    name,
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : String(error),
                    lastCheck: Date.now(),
                });
            }
        });
        await Promise.allSettled(checkPromises);
        const overallStatus = this.determineOverallStatus(checks);
        return {
            status: overallStatus,
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            version: process.env['npm_package_version'] || '1.0.0',
            environment: process.env['NODE_ENV'] || 'development',
            checks,
        };
    }
    determineOverallStatus(checks) {
        const criticalChecks = checks.filter(check => this.config.criticalChecks.includes(check.name));
        const warningChecks = checks.filter(check => this.config.warningChecks.includes(check.name));
        if (criticalChecks.some(check => check.status === 'unhealthy')) {
            return 'unhealthy';
        }
        if (criticalChecks.some(check => check.status === 'degraded')) {
            return 'degraded';
        }
        if (warningChecks.some(check => check.status === 'unhealthy')) {
            return 'degraded';
        }
        return 'healthy';
    }
    async startPeriodicChecks() {
        setInterval(async () => {
            try {
                const result = await this.performHealthCheck();
                logger.info('Periodic health check completed', {
                    status: result.status,
                    checksCount: result.checks.length,
                });
            }
            catch (error) {
                logger.error('Periodic health check failed:', error);
            }
        }, this.config.interval);
    }
}
//# sourceMappingURL=checker.js.map