import { CacheEntry, CacheConfig, CacheLevel, CacheMetrics, CacheOperation } from './types';
import pino from 'pino';

export class L1MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private logger: pino.Logger;
  private metrics: CacheMetrics;
  private operations: CacheOperation[] = [];

  constructor(config: CacheConfig) {
    this.config = config;
    this.logger = pino({
      level: process.env['LOG_LEVEL'] || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      size: 0,
      maxSize: config.maxSize,
      memoryUsage: 0,
      averageAccessTime: 0,
    };

    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.recordOperation('get', key, false, Date.now() - startTime);
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.recordOperation('get', key, false, Date.now() - startTime);
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.metrics.hits++;
      this.updateHitRate();
      this.updateAverageAccessTime(Date.now() - startTime);

      this.recordOperation('get', key, true, Date.now() - startTime);
      return this.deserializeValue<T>(entry.value as string);
    } catch (error) {
      this.logger.error({ key, error }, 'L1 cache get error');
      this.recordOperation('get', key, false, Date.now() - startTime);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const startTime = Date.now();

    try {
      const serializedValue = this.serializeValue(value);
      const entry: CacheEntry = {
        key,
        value: serializedValue,
        ttl: ttl || this.config.ttl,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        size: this.calculateSize(value),
        compressed: this.config.compression,
        encrypted: this.config.encryption,
      };

      if (this.config.compression) {
        entry.value = this.compress(entry.value as string);
      }

      if (this.config.encryption) {
        entry.value = this.encrypt(entry.value as string);
      }

      this.evictIfNeeded();
      this.cache.set(key, entry);
      this.updateSize();
      this.updateMemoryUsage();

      this.recordOperation('set', key, true, Date.now() - startTime);
      return true;
    } catch (error) {
      this.logger.error({ key, error }, 'L1 cache set error');
      this.recordOperation('set', key, false, Date.now() - startTime);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      const existed = this.cache.has(key);
      this.cache.delete(key);
      this.updateSize();
      this.updateMemoryUsage();

      this.recordOperation('delete', key, existed, Date.now() - startTime);
      return existed;
    } catch (error) {
      this.logger.error({ key, error }, 'L1 cache delete error');
      this.recordOperation('delete', key, false, Date.now() - startTime);
      return false;
    }
  }

  async clear(): Promise<void> {
    const startTime = Date.now();

    try {
      this.cache.clear();
      this.updateSize();
      this.updateMemoryUsage();
      this.resetMetrics();

      this.recordOperation('clear', 'all', true, Date.now() - startTime);
    } catch (error) {
      this.logger.error({ error }, 'L1 cache clear error');
      this.recordOperation('clear', 'all', false, Date.now() - startTime);
    }
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getOperations(limit: number = 100): CacheOperation[] {
    return this.operations.slice(-limit);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  private evictIfNeeded(): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }
  }

  private evict(): void {
    const entries = Array.from(this.cache.entries());

    switch (this.config.evictionPolicy) {
      case 'lru':
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu':
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'fifo':
        entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
        break;
      case 'ttl':
        entries.sort((a, b) => a[1].ttl - b[1].ttl);
        break;
      case 'random':
        entries.sort(() => Math.random() - 0.5);
        break;
    }

    const toEvict = Math.floor(this.config.maxSize * 0.1);
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
        this.metrics.evictions++;
      }
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.metrics.evictions++;
    });

    if (expiredKeys.length > 0) {
      this.updateSize();
      this.updateMemoryUsage();
    }
  }

  private serializeValue<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserializeValue<T>(value: string): T {
    return JSON.parse(value);
  }

  private calculateSize(value: unknown): number {
    return JSON.stringify(value).length;
  }

  private compress(value: string): string {
    return value;
  }

  private encrypt(value: string): string {
    return value;
  }

  private updateSize(): void {
    this.metrics.size = this.cache.size;
  }

  private updateMemoryUsage(): void {
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private updateAverageAccessTime(duration: number): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.averageAccessTime =
      (this.metrics.averageAccessTime * (total - 1) + duration) / total;
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      size: 0,
      maxSize: this.config.maxSize,
      memoryUsage: 0,
      averageAccessTime: 0,
    };
  }

  private recordOperation(
    operation: string,
    key: string,
    success: boolean,
    duration: number
  ): void {
    this.operations.push({
      operation: operation as 'get' | 'set' | 'delete' | 'clear',
      key,
      success,
      duration,
      timestamp: Date.now(),
      level: CacheLevel.L1_MEMORY,
    });

    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-500);
    }
  }
}
