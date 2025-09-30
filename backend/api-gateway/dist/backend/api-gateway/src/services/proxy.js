import axios from 'axios';
import { logger } from '../config';
import { gatewayRequestsTotal, gatewayRequestDuration } from './metrics';
export class ProxyService {
    services;
    httpClients = new Map();
    constructor(services) {
        this.services = services;
        this.initializeHttpClients();
    }
    initializeHttpClients() {
        Object.entries(this.services).forEach(([serviceName, serviceUrl]) => {
            const client = axios.create({
                baseURL: serviceUrl,
                timeout: 30000,
                maxRedirects: 5,
                headers: {
                    'Connection': 'keep-alive',
                    'Keep-Alive': 'timeout=5, max=1000'
                }
            });
            this.httpClients.set(serviceName, client);
        });
    }
    async proxyRequest(req, res, serviceName, path) {
        const timer = gatewayRequestDuration.startTimer({
            method: req.method,
            route: path,
            service: serviceName
        });
        try {
            const client = this.httpClients.get(serviceName);
            if (!client) {
                throw new Error(`No HTTP client found for service: ${serviceName}`);
            }
            logger.info(`Proxying ${req.method} ${req.path} to ${serviceName}`);
            const response = await client({
                method: req.method,
                url: path,
                data: req.body,
                headers: {
                    ...req.headers,
                    host: undefined,
                    'content-length': undefined
                },
                params: req.query,
                validateStatus: () => true
            });
            gatewayRequestsTotal.inc({
                method: req.method,
                route: path,
                service: serviceName,
                status_code: response.status.toString()
            });
            res.status(response.status);
            Object.entries(response.headers).forEach(([key, value]) => {
                if (key.toLowerCase() !== 'transfer-encoding') {
                    res.set(key, value);
                }
            });
            res.send(response.data);
        }
        catch (error) {
            gatewayRequestsTotal.inc({
                method: req.method,
                route: path,
                service: serviceName,
                status_code: '500'
            });
            logger.error(`Proxy error for ${serviceName}:`, error);
            res.status(500).json({
                error: 'Service temporarily unavailable',
                service: serviceName
            });
        }
        finally {
            timer();
        }
    }
    async shutdown() {
        logger.info('Shutting down ProxyService connection pools...');
        // Close all HTTP clients
        this.httpClients.clear();
        logger.info('ProxyService shutdown complete');
    }
}
//# sourceMappingURL=proxy.js.map