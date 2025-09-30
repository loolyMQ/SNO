import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitor } from './performance-monitor';
export declare function createMonitoringMiddleware(performanceMonitor: PerformanceMonitor): (_req: Request, res: Response, next: NextFunction) => void;
export declare function createDatabaseMonitoringMiddleware(performanceMonitor: PerformanceMonitor): (operation: string, table: string, queryFn: () => Promise<unknown>) => (..._args: unknown[]) => Promise<unknown>;
export declare function createCacheMonitoringMiddleware(performanceMonitor: PerformanceMonitor): (cacheName: string) => {
    recordHit: () => void;
    recordMiss: () => void;
    getStats: () => {
        hits: number;
        misses: number;
        hitRate: number;
    };
};
export declare function createQueueMonitoringMiddleware(performanceMonitor: PerformanceMonitor): (queueName: string) => {
    setQueueSize: (size: number) => void;
    recordQueueOperation: (operation: string, duration: number, success: boolean) => void;
};
//# sourceMappingURL=middleware.d.ts.map