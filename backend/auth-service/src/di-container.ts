import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface Dependencies {
  prisma: PrismaClient;
  redis: Redis;
  bcrypt: typeof bcrypt;
  jwt: typeof jwt;
  zod: typeof z;
}

export class DIContainer {
  private static instance: DIContainer;
  private dependencies: Partial<Dependencies> = {};

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  register<T extends keyof Dependencies>(key: T, dependency: Dependencies[T]): void {
    this.dependencies[key] = dependency;
  }

  get<T extends keyof Dependencies>(key: T): Dependencies[T] {
    const dependency = this.dependencies[key];
    if (!dependency) {
      throw new Error(`Dependency ${key} not found`);
    }
    return dependency;
  }

  async initialize(): Promise<void> {
    // Initialize Prisma
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./dev.db',
        },
      },
      log: ['query', 'info', 'warn', 'error'],
    });
    this.register('prisma', prisma);

    // Initialize Redis
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
    });
    this.register('redis', redis);

    // Register utilities
    this.register('bcrypt', bcrypt);
    this.register('jwt', jwt);
    this.register('zod', z);
  }

  async cleanup(): Promise<void> {
    const prisma = this.dependencies.prisma;
    const redis = this.dependencies.redis;

    if (prisma) {
      await prisma.$disconnect();
    }

    if (redis) {
      await redis.disconnect();
    }
  }
}

