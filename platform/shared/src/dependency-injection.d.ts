import pino from 'pino';
import { Server } from 'http';
export type DependencyKey = string | symbol;
export interface IService {
    initialize?(): Promise<void>;
    shutdown?(): Promise<void>;
}
export interface ServiceConfig {
    singleton?: boolean;
    lazy?: boolean;
    factory?: boolean;
    dependencies?: DependencyKey[];
}
export type ServiceFactory<T> = (container: DIContainer) => T | Promise<T>;
export declare const DI_TOKENS: {
    readonly KAFKA_CLIENT: symbol;
    readonly REDIS_CLIENT: symbol;
    readonly DATABASE_INDEX_MANAGER: symbol;
    readonly LOGGER: symbol;
    readonly CONFIG: symbol;
    readonly METRICS: symbol;
    readonly HTTP_SERVER: symbol;
    readonly EXPRESS_APP: symbol;
};
export interface ServiceMap {
}
export declare class DIContainerError extends Error {
    readonly key: DependencyKey;
    constructor(message: string, key: DependencyKey);
}
export declare class CircularDependencyError extends DIContainerError {
    constructor(key: DependencyKey, cycle: DependencyKey[]);
}
export declare class DIContainer {
    private services;
    private resolutionStack;
    private initializationPromises;
    register<T>(key: DependencyKey, factory: ServiceFactory<T>, config?: ServiceConfig): this;
    registerSingleton<T>(key: DependencyKey, factory: ServiceFactory<T>, config?: Omit<ServiceConfig, 'singleton'>): this;
    registerTransient<T>(key: DependencyKey, factory: ServiceFactory<T>, config?: Omit<ServiceConfig, 'singleton'>): this;
    registerValue<T>(key: DependencyKey, value: T): this;
    registerFactory<T>(key: DependencyKey, factory: ServiceFactory<() => T>, config?: ServiceConfig): this;
    resolve<T>(key: DependencyKey): Promise<T>;
    get<T>(key: DependencyKey): T;
    private createInstance;
    isRegistered(key: DependencyKey): boolean;
    getRegisteredServices(): DependencyKey[];
    initializeAll(): Promise<void>;
    shutdown(): Promise<void>;
    createChild(): DIContainer;
    middleware(): (req: {
        container?: DIContainer;
    }, _res: unknown, next: () => void) => void;
}
export declare const globalContainer: DIContainer;
export declare const serviceFactories: {
    kafkaClient: (serviceName: string) => (_container: DIContainer) => any;
    redisClient: (serviceName: string, config?: Record<string, unknown>) => (_container: DIContainer) => any;
    databaseIndexManager: (serviceName: string) => (_container: DIContainer) => any;
    logger: (config: pino.LoggerOptions) => (_container: DIContainer) => any;
    expressApp: () => (_container: DIContainer) => any;
};
export declare function inject(key: DependencyKey): (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare function injectable(key?: DependencyKey, config?: ServiceConfig): <T extends new (...args: unknown[]) => object>(constructor: T) => T;
export declare const DIUtils: {
    createServiceContainer(serviceName: string): DIContainer;
    shutdownService(container: DIContainer, server?: Server): Promise<void>;
};
//# sourceMappingURL=dependency-injection.d.ts.map