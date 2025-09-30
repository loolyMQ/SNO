import { register, Gauge, Counter, Histogram, Summary } from 'prom-client';
import os from 'os';
import process from 'process';

export interface ResourceMetrics {
  memory: {
    used: number;
    total: number;
    free: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
  };
}

export class ResourceMonitor {
  private memoryGauge: Gauge<string>;
  private cpuGauge: Gauge<string>;
  private processMemoryGauge: Gauge<string>;
  private processCpuGauge: Gauge<string>;
  private requestCounter: Counter<string>;
  private responseTimeHistogram: Histogram<string>;
  private errorCounter: Counter<string>;
  private activeConnectionsGauge: Gauge<string>;
  private gcDurationSummary: Summary<string>;

  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime: number = 0;

  constructor(serviceName: string) {
    this.memoryGauge = new Gauge({
      name: `${serviceName}_memory_usage_bytes`,
      help: 'Memory usage in bytes',
      labelNames: ['type'],
    });

    this.cpuGauge = new Gauge({
      name: `${serviceName}_cpu_usage_percent`,
      help: 'CPU usage percentage',
      labelNames: ['type'],
    });

    this.processMemoryGauge = new Gauge({
      name: `${serviceName}_process_memory_bytes`,
      help: 'Process memory usage in bytes',
      labelNames: ['type'],
    });

    this.processCpuGauge = new Gauge({
      name: `${serviceName}_process_cpu_percent`,
      help: 'Process CPU usage percentage',
    });

    this.requestCounter = new Counter({
      name: `${serviceName}_requests_total`,
      help: 'Total number of requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.responseTimeHistogram = new Histogram({
      name: `${serviceName}_request_duration_seconds`,
      help: 'Request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.errorCounter = new Counter({
      name: `${serviceName}_errors_total`,
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
    });

    this.activeConnectionsGauge = new Gauge({
      name: `${serviceName}_active_connections`,
      help: 'Number of active connections',
    });

    this.gcDurationSummary = new Summary({
      name: `${serviceName}_gc_duration_seconds`,
      help: 'Garbage collection duration in seconds',
      labelNames: ['type'],
    });

    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
      this.updateProcessMetrics();
    }, 5000);

    if ((process as any).gc) {
      (process as any).on('gc', (info: any) => {
        this.gcDurationSummary.labels({ type: info.kind }).observe(info.duration / 1000);
      });
    }
  }

  private updateSystemMetrics(): void {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    this.memoryGauge.labels({ type: 'total' }).set(totalMemory);
    this.memoryGauge.labels({ type: 'used' }).set(usedMemory);
    this.memoryGauge.labels({ type: 'free' }).set(freeMemory);

    const loadAverage = os.loadavg();
    this.cpuGauge.labels({ type: 'load_1m' }).set(loadAverage[0] || 0);
    this.cpuGauge.labels({ type: 'load_5m' }).set(loadAverage[1] || 0);
    this.cpuGauge.labels({ type: 'load_15m' }).set(loadAverage[2] || 0);
  }

  private updateProcessMetrics(): void {
    const memoryUsage = process.memoryUsage();

    this.processMemoryGauge.labels({ type: 'rss' }).set(memoryUsage.rss);
    this.processMemoryGauge.labels({ type: 'heapTotal' }).set(memoryUsage.heapTotal);
    this.processMemoryGauge.labels({ type: 'heapUsed' }).set(memoryUsage.heapUsed);
    this.processMemoryGauge.labels({ type: 'external' }).set(memoryUsage.external);
    this.processMemoryGauge.labels({ type: 'arrayBuffers' }).set(memoryUsage.arrayBuffers);

    const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    const now = Date.now();

    if (this.lastCpuTime > 0) {
      const timeDiff = now - this.lastCpuTime;
      const cpuDiff = (cpuUsage.user + cpuUsage.system) / 1000;
      const cpuPercent = (cpuDiff / timeDiff) * 100;

      this.processCpuGauge.set(Math.min(cpuPercent, 100));
    }

    this.lastCpuUsage = cpuUsage;
    this.lastCpuTime = now;
  }

  public recordRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.requestCounter.labels({ method, route, status: statusCode.toString() }).inc();
    this.responseTimeHistogram.labels({ method, route }).observe(duration);
  }

  public recordError(type: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.errorCounter.labels({ type, severity }).inc();
  }

  public setActiveConnections(count: number): void {
    this.activeConnectionsGauge.set(count);
  }

  public getCurrentMetrics(): ResourceMetrics {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        free: freeMemory,
        percentage: (usedMemory / totalMemory) * 100,
      },
      cpu: {
        usage: 0,
        loadAverage: os.loadavg(),
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage,
        cpuUsage,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: os.uptime(),
      },
    };
  }

  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  public clearMetrics(): void {
    register.clear();
  }
}
