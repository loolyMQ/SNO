import pino from 'pino';
import { IConnectionPool, IPoolStats } from './interfaces';
export declare class ConnectionPoolManager {
    private pools;
    private logger;
    constructor(logger?: pino.Logger);
    registerPool<T>(name: string, pool: IConnectionPool<T>): void;
    getPool<T>(name: string): IConnectionPool<T> | undefined;
    getAllStats(): Promise<Record<string, IPoolStats>>;
    healthCheckAll(): Promise<Record<string, boolean>>;
    shutdownAll(): Promise<void>;
}
//# sourceMappingURL=pool-manager.d.ts.map