import { HealthCheckResult } from '../types';

export class HealthChecker {
  private serviceVersion: string;
  private startTime: number;
  private dependencies: Map<string, () => Promise<boolean>> = new Map();

  constructor(serviceName: string, serviceVersion: string) {
    this.serviceVersion = serviceVersion;
    this.startTime = Date.now();
  }

  // Добавление проверки зависимости
  addDependency(name: string, checkFunction: () => Promise<boolean>): void {
    this.dependencies.set(name, checkFunction);
  }

  // Проверка состояния сервиса
  async checkHealth(): Promise<HealthCheckResult> {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    // Проверка зависимостей
    const dependencies: Record<string, any> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    for (const [name, checkFunction] of this.dependencies) {
      try {
        const startTime = Date.now();
        const isHealthy = await checkFunction();
        const responseTime = Date.now() - startTime;

        dependencies[name] = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          lastCheck: Date.now(),
        };

        if (!isHealthy) {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        dependencies[name] = {
          status: 'unhealthy',
          lastCheck: Date.now(),
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      uptime,
      version: this.serviceVersion,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
      dependencies,
    };
  }

  // Проверка только критических зависимостей
  async checkCriticalHealth(): Promise<boolean> {
    for (const [name, checkFunction] of this.dependencies) {
      try {
        const isHealthy = await checkFunction();
        if (!isHealthy) {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
    return true;
  }
}

// Предустановленные проверки для популярных сервисов
export class DatabaseHealthCheck {
  static async checkPostgreSQL(connectionString: string): Promise<boolean> {
    try {
      // Здесь должна быть реальная проверка подключения к PostgreSQL
      // Для примера используем простую проверку
      const { Client } = require('pg');
      const client = new Client({ connectionString });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch (error) {
      return false;
    }
  }

  static async checkRedis(host: string, port: number): Promise<boolean> {
    try {
      // Здесь должна быть реальная проверка подключения к Redis
      // Для примера используем простую проверку
      const net = require('net');
      return new Promise((resolve) => {
        const socket = net.createConnection(port, host);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('error', () => {
          resolve(false);
        });
        socket.setTimeout(5000, () => {
          socket.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }
}

export class ExternalServiceHealthCheck {
  static async checkHttpEndpoint(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const fetch = require('node-fetch');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  static async checkMeilisearch(url: string): Promise<boolean> {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  static async checkRabbitMQ(host: string, port: number): Promise<boolean> {
    try {
      const net = require('net');
      return new Promise((resolve) => {
        const socket = net.createConnection(port, host);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('error', () => {
          resolve(false);
        });
        socket.setTimeout(5000, () => {
          socket.destroy();
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }
}
