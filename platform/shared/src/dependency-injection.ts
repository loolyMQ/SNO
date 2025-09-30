import { KafkaClient } from './kafka-client';
import { RedisClient } from './redis-client';
import { DatabaseIndexManager } from './database-indexes';
import pino from 'pino';
import { Server } from 'http';
import { Express } from 'express';

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

interface ServiceRegistration<T = unknown> {
  factory: ServiceFactory<T>;
  config: ServiceConfig;
  instance?: T;
  initialized?: boolean;
}

export const DI_TOKENS = {
  KAFKA_CLIENT: Symbol('KafkaClient'),
  REDIS_CLIENT: Symbol('RedisClient'),
  DATABASE_INDEX_MANAGER: Symbol('DatabaseIndexManager'),
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  METRICS: Symbol('Metrics'),
  HTTP_SERVER: Symbol('HttpServer'),
  EXPRESS_APP: Symbol('ExpressApp'),
} as const;

export interface ServiceMap {
  [DI_TOKENS.KAFKA_CLIENT]: KafkaClient;
  [DI_TOKENS.REDIS_CLIENT]: RedisClient;
  [DI_TOKENS.DATABASE_INDEX_MANAGER]: DatabaseIndexManager;
  [DI_TOKENS.LOGGER]: pino.Logger;
  [DI_TOKENS.CONFIG]: Record<string, unknown>;
  [DI_TOKENS.METRICS]: Record<string, unknown>;
  [DI_TOKENS.HTTP_SERVER]: Server;
  [DI_TOKENS.EXPRESS_APP]: Express;
}

export class DIContainerError extends Error {
  constructor(
    message: string,
    public readonly key: DependencyKey
  ) {
    super(`DI Container Error for '${String(key)}': ${message}`);
    this.name = 'DIContainerError';
  }
}

export class CircularDependencyError extends DIContainerError {
  constructor(key: DependencyKey, cycle: DependencyKey[]) {
    super(`Circular dependency detected: ${cycle.map(String).join(' -> ')} -> ${String(key)}`, key);
    this.name = 'CircularDependencyError';
  }
}

export class DIContainer {
  private services = new Map<DependencyKey, ServiceRegistration>();
  private resolutionStack: DependencyKey[] = [];
  private initializationPromises = new Map<DependencyKey, Promise<any>>();

  register<T>(key: DependencyKey, factory: ServiceFactory<T>, config: ServiceConfig = {}): this {
    const defaultConfig: ServiceConfig = {
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

  registerSingleton<T>(
    key: DependencyKey,
    factory: ServiceFactory<T>,
    config: Omit<ServiceConfig, 'singleton'> = {}
  ): this {
    return this.register(key, factory, { ...config, singleton: true });
  }

  registerTransient<T>(
    key: DependencyKey,
    factory: ServiceFactory<T>,
    config: Omit<ServiceConfig, 'singleton'> = {}
  ): this {
    return this.register(key, factory, { ...config, singleton: false });
  }

  registerValue<T>(key: DependencyKey, value: T): this {
    return this.register(key, () => value, { singleton: true, lazy: false });
  }

  registerFactory<T>(
    key: DependencyKey,
    factory: ServiceFactory<() => T>,
    config: ServiceConfig = {}
  ): this {
    return this.register(key, factory, { ...config, factory: true });
  }

  async resolve<T>(key: DependencyKey): Promise<T> {
    const registration = this.services.get(key);

    if (!registration) {
      throw new DIContainerError(`Service not registered`, key);
    }

    if (this.resolutionStack.includes(key)) {
      throw new CircularDependencyError(key, [...this.resolutionStack]);
    }

    if (registration.config.singleton && registration.instance) {
      return registration.instance as T;
    }

    if (this.initializationPromises.has(key)) {
      return this.initializationPromises.get(key)!;
    }

    const initPromise = this.createInstance<T>(key, registration as ServiceRegistration<T>);
    this.initializationPromises.set(key, initPromise);

    try {
      const instance = await initPromise;

      if (registration.config.singleton) {
        registration.instance = instance;
      }

      return instance;
    } finally {
      this.initializationPromises.delete(key);
    }
  }

  get<T>(key: DependencyKey): T {
    const registration = this.services.get(key);

    if (!registration) {
      throw new DIContainerError(`Service not registered`, key);
    }

    if (!registration.config.singleton || !registration.instance) {
      throw new DIContainerError(`Service not initialized or not a singleton`, key);
    }

    return registration.instance as T;
  }

  private async createInstance<T>(
    key: DependencyKey,
    registration: ServiceRegistration<T>
  ): Promise<T> {
    this.resolutionStack.push(key);

    try {
      const dependencies = registration.config.dependencies || [];
      for (const dep of dependencies) {
        await this.resolve(dep);
      }

      const instance = await registration.factory(this);

      if (instance && typeof (instance as any).initialize === 'function') {
        await (instance as any).initialize();
        registration.initialized = true;
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  isRegistered(key: DependencyKey): boolean {
    return this.services.has(key);
  }

  getRegisteredServices(): DependencyKey[] {
    const keys: DependencyKey[] = [];
    for (const key of this.services.keys()) {
      keys.push(key);
    }
    return keys;
  }

  async initializeAll(): Promise<void> {
    const promises: Promise<any>[] = [];

    const services = Array.from(this.services.entries());
    for (const [key, registration] of services) {
      if (!registration.config.lazy) {
        promises.push(this.resolve(key));
      }
    }

    await Promise.all(promises);
  }

  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    const services = Array.from(this.services.entries());
    for (const [key, registration] of services) {
      if (registration.instance && typeof (registration.instance as any).shutdown === 'function') {
        shutdownPromises.push(
          (registration.instance as any).shutdown().catch((error: Error) => {
            console.error({ error, service: String(key) }, 'Error shutting down service');
          })
        );
      }
    }

    await Promise.all(shutdownPromises);

    this.services.clear();
    this.initializationPromises.clear();
  }

  createChild(): DIContainer {
    const child = new DIContainer();

    const services = Array.from(this.services.entries());
    for (const [key, registration] of services) {
      child.services.set(key, { ...registration });
    }

    return child;
  }

  middleware() {
    return (req: { container?: DIContainer }, _res: unknown, next: () => void) => {
      req.container = this;
      next();
    };
  }
}

export const globalContainer = new DIContainer();

export const serviceFactories = {
  kafkaClient: (serviceName: string) => (_container: DIContainer) => {
    const { createKafkaClient } = require('./kafka-client');
    return createKafkaClient(serviceName);
  },

  redisClient:
    (serviceName: string, config?: Record<string, unknown>) => (_container: DIContainer) => {
      const { createRedisClient } = require('./redis-client');
      return createRedisClient(serviceName, config);
    },

  databaseIndexManager: (serviceName: string) => (_container: DIContainer) => {
    const { createDatabaseIndexManager } = require('./database-indexes');
    return createDatabaseIndexManager(serviceName);
  },

  logger: (config: pino.LoggerOptions) => (_container: DIContainer) => {
    const pino = require('pino');
    return pino(config);
  },

  expressApp: () => (_container: DIContainer) => {
    const express = require('express');
    return express();
  },
};

export function inject(key: DependencyKey) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const container = (this as { container?: DIContainer }).container || globalContainer;
      const dependency = await container.resolve(key);
      return originalMethod.call(this, dependency, ...args);
    };
  };
}

export function injectable(key?: DependencyKey, config?: ServiceConfig) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T) {
    const serviceKey = key || constructor.name;

    globalContainer.register(serviceKey, container => new constructor(container), config);

    return constructor;
  };
}

export const DIUtils = {
  createServiceContainer(serviceName: string): DIContainer {
    const container = new DIContainer();

    container.registerSingleton(DI_TOKENS.KAFKA_CLIENT, serviceFactories.kafkaClient(serviceName));

    container.registerSingleton(DI_TOKENS.REDIS_CLIENT, serviceFactories.redisClient(serviceName));

    container.registerSingleton(
      DI_TOKENS.DATABASE_INDEX_MANAGER,
      serviceFactories.databaseIndexManager(serviceName)
    );

    container.registerSingleton(
      DI_TOKENS.LOGGER,
      serviceFactories.logger({
        level: process.env['LOG_LEVEL'] || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      })
    );

    container.registerSingleton(DI_TOKENS.EXPRESS_APP, serviceFactories.expressApp());

    container.registerValue(DI_TOKENS.CONFIG, {
      serviceName,
      port: process.env['PORT'] || 3000,
      kafkaBrokers: process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9092'],
      logLevel: process.env['LOG_LEVEL'] || 'info',
    });

    return container;
  },

  async shutdownService(container: DIContainer, server?: Server): Promise<void> {
    console.log('Shutting down service...');

    if (server) {
      await new Promise<void>(resolve => {
        server.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      });
    }

    await container.shutdown();
    console.log('All services shut down');
  },
};
