export const DI_TOKENS = {
    KAFKA_CLIENT: Symbol('KafkaClient'),
    REDIS_CLIENT: Symbol('RedisClient'),
    DATABASE_INDEX_MANAGER: Symbol('DatabaseIndexManager'),
    LOGGER: Symbol('Logger'),
    CONFIG: Symbol('Config'),
    METRICS: Symbol('Metrics'),
    HTTP_SERVER: Symbol('HttpServer'),
    EXPRESS_APP: Symbol('ExpressApp'),
};
export class DIContainerError extends Error {
    key;
    constructor(message, key) {
        super(`DI Container Error for '${String(key)}': ${message}`);
        this.key = key;
        this.name = 'DIContainerError';
    }
}
export class CircularDependencyError extends DIContainerError {
    constructor(key, cycle) {
        super(`Circular dependency detected: ${cycle.map(String).join(' -> ')} -> ${String(key)}`, key);
        this.name = 'CircularDependencyError';
    }
}
export class DIContainer {
    services = new Map();
    resolutionStack = [];
    initializationPromises = new Map();
    register(key, factory, config = {}) {
        const defaultConfig = {
            singleton: true,
            lazy: true,
            factory: false,
            dependencies: [],
        };
        this.services.set(key, {
            factory,
            config: { ...defaultConfig, ...config },
        });
        return this;
    }
    registerSingleton(key, factory, config = {}) {
        return this.register(key, factory, { ...config, singleton: true });
    }
    registerTransient(key, factory, config = {}) {
        return this.register(key, factory, { ...config, singleton: false });
    }
    registerValue(key, value) {
        return this.register(key, () => value, { singleton: true, lazy: false });
    }
    registerFactory(key, factory, config = {}) {
        return this.register(key, factory, { ...config, factory: true });
    }
    async resolve(key) {
        const registration = this.services.get(key);
        if (!registration) {
            throw new DIContainerError(`Service not registered`, key);
        }
        if (this.resolutionStack.includes(key)) {
            throw new CircularDependencyError(key, [...this.resolutionStack]);
        }
        if (registration.config.singleton && registration.instance) {
            return registration.instance;
        }
        if (this.initializationPromises.has(key)) {
            const promise = this.initializationPromises.get(key);
            if (promise) {
                return promise;
            }
        }
        const initPromise = this.createInstance(key, registration);
        this.initializationPromises.set(key, initPromise);
        try {
            const instance = await initPromise;
            if (registration.config.singleton) {
                registration.instance = instance;
            }
            return instance;
        }
        finally {
            this.initializationPromises.delete(key);
        }
    }
    get(key) {
        const registration = this.services.get(key);
        if (!registration) {
            throw new DIContainerError(`Service not registered`, key);
        }
        if (!registration.config.singleton || !registration.instance) {
            throw new DIContainerError(`Service not initialized or not a singleton`, key);
        }
        return registration.instance;
    }
    async createInstance(key, registration) {
        this.resolutionStack.push(key);
        try {
            const dependencies = registration.config.dependencies || [];
            for (const dep of dependencies) {
                await this.resolve(dep);
            }
            const instance = await registration.factory(this);
            if (instance && typeof instance.initialize === 'function') {
                await instance.initialize();
                registration.initialized = true;
            }
            return instance;
        }
        finally {
            this.resolutionStack.pop();
        }
    }
    isRegistered(key) {
        return this.services.has(key);
    }
    getRegisteredServices() {
        const keys = [];
        for (const key of this.services.keys()) {
            keys.push(key);
        }
        return keys;
    }
    async initializeAll() {
        const promises = [];
        const services = Array.from(this.services.entries());
        for (const [key, registration] of services) {
            if (!registration.config.lazy) {
                promises.push(this.resolve(key));
            }
        }
        await Promise.all(promises);
    }
    async shutdown() {
        const shutdownPromises = [];
        const services = Array.from(this.services.entries());
        for (const [key, registration] of services) {
            if (registration.instance && typeof registration.instance.shutdown === 'function') {
                shutdownPromises.push(registration.instance.shutdown().catch((error) => {
                    // В продакшене здесь будет структурированное логирование
                    // logger.error({ error, service: String(key) }, 'Error shutting down service');
                }));
            }
        }
        await Promise.all(shutdownPromises);
        this.services.clear();
        this.initializationPromises.clear();
    }
    createChild() {
        const child = new DIContainer();
        const services = Array.from(this.services.entries());
        for (const [key, registration] of services) {
            child.services.set(key, { ...registration });
        }
        return child;
    }
    middleware() {
        return (req, _res, next) => {
            req.container = this;
            next();
        };
    }
}
export const globalContainer = new DIContainer();
export const serviceFactories = {
    kafkaClient: (serviceName) => (_container) => {
        const { createKafkaClient } = require('./kafka-client');
        return createKafkaClient(serviceName);
    },
    redisClient: (serviceName, config) => (_container) => {
        const { createRedisClient } = require('./redis-client');
        return createRedisClient(serviceName, config);
    },
    databaseIndexManager: (serviceName) => (_container) => {
        const { createDatabaseIndexManager } = require('./database-indexes');
        return createDatabaseIndexManager(serviceName);
    },
    logger: (config) => (_container) => {
        const pino = require('pino');
        return pino(config);
    },
    expressApp: () => (_container) => {
        const express = require('express');
        return express();
    },
};
export function inject(key) {
    return function (_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const container = this.container || globalContainer;
            const dependency = await container.resolve(key);
            return originalMethod.call(this, dependency, ...args);
        };
    };
}
export function injectable(key, config) {
    return function (constructor) {
        const serviceKey = key || constructor.name;
        globalContainer.register(serviceKey, container => new constructor(container), config);
        return constructor;
    };
}
export const DIUtils = {
    createServiceContainer(serviceName) {
        const container = new DIContainer();
        container.registerSingleton(DI_TOKENS.KAFKA_CLIENT, serviceFactories.kafkaClient(serviceName));
        container.registerSingleton(DI_TOKENS.REDIS_CLIENT, serviceFactories.redisClient(serviceName));
        container.registerSingleton(DI_TOKENS.DATABASE_INDEX_MANAGER, serviceFactories.databaseIndexManager(serviceName));
        container.registerSingleton(DI_TOKENS.LOGGER, serviceFactories.logger({
            level: process.env['LOG_LEVEL'] || 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }));
        container.registerSingleton(DI_TOKENS.EXPRESS_APP, serviceFactories.expressApp());
        container.registerValue(DI_TOKENS.CONFIG, {
            serviceName,
            port: process.env['PORT'] || 3000,
            kafkaBrokers: process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9092'],
            logLevel: process.env['LOG_LEVEL'] || 'info',
        });
        return container;
    },
    async shutdownService(container, server) {
        // В продакшене здесь будет структурированное логирование
        if (server) {
            await new Promise(resolve => {
                server.close(() => {
                    resolve();
                });
            });
        }
        await container.shutdown();
    },
};
//# sourceMappingURL=dependency-injection.js.map