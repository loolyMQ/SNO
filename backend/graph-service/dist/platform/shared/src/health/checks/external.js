import axios from 'axios';
export async function createExternalServiceHealthCheck(name, url, timeout = 5000) {
    const startTime = Date.now();
    try {
        const response = await axios.get(`${url}/health`, {
            timeout,
            validateStatus: status => status < 500,
        });
        const responseTime = Date.now() - startTime;
        const isHealthy = response.status === 200 && response.data?.status === 'healthy';
        const isDegraded = response.status >= 400 || responseTime > 2000;
        return {
            name,
            url,
            status: isHealthy ? 'healthy' : isDegraded ? 'degraded' : 'unhealthy',
            responseTime,
            lastCheck: Date.now(),
            statusCode: response.status,
            details: {
                responseData: response.data,
            },
        };
    }
    catch (error) {
        return {
            name,
            url,
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            statusCode: error.response?.status,
        };
    }
}
export async function checkMultipleExternalServices(services) {
    const promises = services.map(service => createExternalServiceHealthCheck(service.name, service.url));
    return Promise.allSettled(promises).then(results => results.map((result, index) => result.status === 'fulfilled'
        ? result.value
        : {
            name: services[index]?.name || 'unknown',
            url: services[index]?.url || '',
            status: 'unhealthy',
            responseTime: 0,
            lastCheck: Date.now(),
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        }));
}
//# sourceMappingURL=external.js.map