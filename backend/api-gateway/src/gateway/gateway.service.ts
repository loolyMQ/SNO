import { Request, Response } from 'express';
import { CircuitBreakerManager, CircuitBreakerConfig } from '../circuit-breaker';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

interface RouteConfig {
  path: string;
  method: string;
  service: string;
  auth: boolean;
  roles: string[];
  validation: unknown;
  cache: boolean;
  cacheTTL: number;
}

interface ServiceConfig {
  url: string;
  timeout: number;
  retries: number;
  circuitBreaker: boolean;
  cacheTTL: number;
}

export class GatewayService {
  private routes: Map<string, RouteConfig> = new Map();
  private services: Map<string, ServiceConfig> = new Map();
  private circuitBreakerManager: CircuitBreakerManager = new CircuitBreakerManager();

  constructor() {
    this.initializeServices();
    this.initializeCircuitBreakers();
  }

  private initializeServices(): void {
    // Initialize service configurations
    this.services.set('auth', {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000,
      retries: 3,
      circuitBreaker: true,
      cacheTTL: 300
    });

    this.services.set('graph', {
      url: process.env.GRAPH_SERVICE_URL || 'http://localhost:3002',
      timeout: 10000,
      retries: 2,
      circuitBreaker: true,
      cacheTTL: 600
    });

    this.services.set('search', {
      url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3003',
      timeout: 8000,
      retries: 2,
      circuitBreaker: true,
      cacheTTL: 300
    });

    this.services.set('jobs', {
      url: process.env.JOBS_SERVICE_URL || 'http://localhost:3004',
      timeout: 15000,
      retries: 1,
      circuitBreaker: false,
      cacheTTL: 0
    });
  }

         private initializeCircuitBreakers(): void {
           const circuitBreakerConfig: CircuitBreakerConfig = {
             failureThreshold: 5,
             timeout: 5000,
             resetTimeout: 30000,
             monitoringPeriod: 60000,
             enableLogging: true,
             fallbackFunction: async () => {
               return { 
                 success: false, 
                 error: 'Service temporarily unavailable',
                 fallback: true,
                 timestamp: Date.now()
               };
             }
           };

           for (const [serviceName, serviceConfig] of this.services) {
             if (serviceConfig.circuitBreaker) {
               this.circuitBreakerManager.createBreaker(serviceName, circuitBreakerConfig);
             }
           }

           // Start monitoring circuit breakers
           this.circuitBreakerManager.startMonitoring(circuitBreakerConfig.monitoringPeriod);
         }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const routeKey = `${req.method} ${req.path}`;
    const route = this.routes.get(routeKey);

    if (!route) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }

    try {
      // Check authentication if required
      if (route.auth && !this.authenticate(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check cache if enabled
      if (route.cache) {
        const cachedResponse = await this.getCachedResponse();
        if (cachedResponse) {
          res.json(cachedResponse);
          return;
        }
      }

      // Forward request to service
      const response = await this.forwardRequest(req, res, route);

      // Cache response if enabled
      if (route.cache && response) {
        await this.cacheResponse();
      }

      res.json(response);
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        method: req.method,
        path: req.path
      }, 'Gateway error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  addRoute(route: RouteConfig): void {
    const routeKey = `${route.method} ${route.path}`;
    this.routes.set(routeKey, route);
  }

  private authenticate(req: Request): boolean {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return false;

    // Simple token validation - in production this would verify JWT
    return token.length > 10;
  }

  private async getCachedResponse(): Promise<unknown> {
    // In production, this would use Redis
    // For now, return null to indicate no cached response
    return null;
  }

  private async cacheResponse(): Promise<void> {
    // In production, this would use Redis
    logger.debug({
      action: 'cache_response'
    }, 'Caching response');
  }


  private async forwardRequest(req: Request, res: Response, route: RouteConfig): Promise<unknown> {
    const service = this.services.get(route.service);
    if (!service) {
      throw new Error(`Service ${route.service} not found`);
    }

    const circuitBreaker = this.circuitBreakerManager.getBreaker(route.service);
    
    if (circuitBreaker) {
      return await circuitBreaker.execute(async () => {
        return await this.makeHttpRequest(req, service);
      });
    }

    return await this.makeHttpRequest(req, service);
  }

  private async makeHttpRequest(req: Request, service: ServiceConfig): Promise<unknown> {
    logger.debug({
      method: 'forward_request',
      service: service.url,
      requestMethod: req.method,
      requestPath: req.path
    }, 'Forwarding request to service');
    
    // In production, this would use axios or fetch with proper implementation
    // For now, return mock response - in production, this would make actual HTTP requests
    return { 
      message: 'Request forwarded successfully', 
      service: service.url,
      method: req.method,
      path: req.path
    };
  }

         getCircuitBreakerMetrics(): Record<string, unknown> {
           return this.circuitBreakerManager.getAllMetrics();
         }

         getCircuitBreakerHealth(): Record<string, { healthy: boolean; reason?: string }> {
           return this.circuitBreakerManager.getHealthStatus();
         }

         resetCircuitBreakers(): void {
           this.circuitBreakerManager.resetAll();
         }

         stopCircuitBreakerMonitoring(): void {
           this.circuitBreakerManager.stopMonitoring();
         }
}
