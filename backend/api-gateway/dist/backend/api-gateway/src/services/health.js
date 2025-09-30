import axios from 'axios';
import { logger } from '../config';
import { serviceHealthStatus } from './metrics';
export class HealthService {
    services;
    constructor(services) {
        this.services = services;
    }
    async checkService(name, url) {
        try {
            const response = await axios.get(`${url}/health`, {
                timeout: 5000,
                validateStatus: () => true
            });
            const isHealthy = response.status === 200;
            serviceHealthStatus.inc({ service: name, status: isHealthy ? 'healthy' : 'unhealthy' });
            return {
                success: isHealthy,
                status: response.data?.status || 'unknown',
                timestamp: Date.now()
            };
        }
        catch (error) {
            serviceHealthStatus.inc({ service: name, status: 'error' });
            logger.error(`Health check failed for ${name}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            };
        }
    }
    async checkAllServices() {
        const checks = await Promise.allSettled([
            this.checkService('auth', this.services.auth),
            this.checkService('graph', this.services.graph),
            this.checkService('search', this.services.search),
            this.checkService('jobs', this.services.jobs)
        ]);
        return {
            auth: checks[0].status === 'fulfilled' ? checks[0].value : { success: false, error: 'Check failed' },
            graph: checks[1].status === 'fulfilled' ? checks[1].value : { success: false, error: 'Check failed' },
            search: checks[2].status === 'fulfilled' ? checks[2].value : { success: false, error: 'Check failed' },
            jobs: checks[3].status === 'fulfilled' ? checks[3].value : { success: false, error: 'Check failed' }
        };
    }
}
//# sourceMappingURL=health.js.map