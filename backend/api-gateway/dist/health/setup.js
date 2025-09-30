import { HealthChecker, createDatabaseHealthCheck, createRedisHealthCheck, createExternalServiceHealthCheck } from '@science-map/shared';
export function setupHealthChecks(prisma, redis) {
    const healthChecker = new HealthChecker({
        timeout: 5000,
        interval: 30000,
        retries: 3,
        criticalChecks: ['database', 'redis'],
        warningChecks: ['external-services'],
    });
    healthChecker.addCheck('database', () => createDatabaseHealthCheck(prisma));
    healthChecker.addCheck('redis', () => createRedisHealthCheck(redis));
    const externalServices = [
        { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001' },
        { name: 'graph-service', url: process.env.GRAPH_SERVICE_URL || 'http://localhost:3004' },
        { name: 'search-service', url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3005' },
        { name: 'jobs-service', url: process.env.JOBS_SERVICE_URL || 'http://localhost:3006' }
    ];
    externalServices.forEach(service => {
        healthChecker.addCheck(service.name, () => createExternalServiceHealthCheck(service.name, service.url));
    });
    return healthChecker;
}
//# sourceMappingURL=setup.js.map