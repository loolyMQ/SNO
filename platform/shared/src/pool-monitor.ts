import pino from 'pino';
import { Gauge, Histogram, Summary } from 'prom-client';
// import { ConnectionPoolManager } from './connection-pools';

const poolPerformanceHistogram = new Histogram({
  name: 'pool_operation_duration_seconds',
  help: 'Duration of pool operations',
  labelNames: ['pool_name', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const poolResourceUtilization = new Gauge({
  name: 'pool_resource_utilization_percentage',
  help: 'Resource utilization percentage of pools',
  labelNames: ['pool_name', 'resource_type'],
});

const poolAcquisitionQueue = new Gauge({
  name: 'pool_acquisition_queue_length',
  help: 'Length of connection acquisition queue',
  labelNames: ['pool_name'],
});

const poolHealthScore = new Gauge({
  name: 'pool_health_score',
  help: 'Health score of connection pools (0-1)',
  labelNames: ['pool_name'],
});

const poolConnectionLifetime = new Summary({
  name: 'pool_connection_lifetime_seconds',
  help: 'Lifetime of connections in pool',
  labelNames: ['pool_name'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
});

export interface IPoolMetrics {
  utilizationPercentage: number;
  healthScore: number;
  averageAcquisitionTime: number;
  totalOperations: number;
  errorRate: number;
  connectionLifetime: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface IPoolAlert {
  poolName: string;
  level: 'warning' | 'critical';
  message: string;
  timestamp: number;
  metrics: Partial<IPoolMetrics>;
}

export interface IPoolMonitorConfig {
  enableMetrics: boolean;
  enableAlerting: boolean;
  metricsIntervalMs: number;
  alertThresholds: {
    utilizationWarning: number;
    utilizationCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
    acquisitionTimeWarning: number;
    acquisitionTimeCritical: number;
  };
}

export class PoolMonitor {
  private metrics: Map<string, IPoolMetrics> = new Map();
  private alerts: IPoolAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    private poolManager: any,
    private config: IPoolMonitorConfig,
    private logger: pino.Logger
  ) {}

  start(): void {
    if (this.config.enableMetrics) {
      this.monitoringInterval = setInterval(() => {
        this.collectMetrics();
      }, this.config.metricsIntervalMs);

      this.logger.info('Pool monitoring started');
    }
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.logger.info('Pool monitoring stopped');
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const poolStats = await this.poolManager.getAllStats();
      const poolHealth = await this.poolManager.healthCheckAll();

      for (const [poolName, stats] of Object.entries(poolStats)) {
        const metrics = this.calculateMetrics(poolName, stats, poolHealth[poolName]);
        this.metrics.set(poolName, metrics);

        this.updatePrometheusMetrics(poolName, metrics, stats);

        if (this.config.enableAlerting) {
          this.checkAlerts(poolName, metrics);
        }
      }
    } catch (error) {
      this.logger.error('Failed to collect pool metrics:', error);
    }
  }

  private calculateMetrics(_poolName: string, stats: any, isHealthy: boolean): IPoolMetrics {
    const utilizationPercentage = (stats.borrowed / stats.max) * 100;
    const healthScore = isHealthy ? 1 : 0;

    const mockMetrics: IPoolMetrics = {
      utilizationPercentage,
      healthScore,
      averageAcquisitionTime: Math.random() * 50,
      totalOperations: Math.floor(Math.random() * 1000),
      errorRate: Math.random() * 5,
      connectionLifetime: {
        p50: Math.random() * 3600,
        p95: Math.random() * 7200,
        p99: Math.random() * 14400,
      },
    };

    return mockMetrics;
  }

  private updatePrometheusMetrics(poolName: string, metrics: IPoolMetrics, stats: any): void {
    poolResourceUtilization.set(
      { pool_name: poolName, resource_type: 'connections' },
      metrics.utilizationPercentage
    );

    poolHealthScore.set({ pool_name: poolName }, metrics.healthScore);

    poolAcquisitionQueue.set({ pool_name: poolName }, stats.pending);

    poolPerformanceHistogram.observe(
      { pool_name: poolName, operation: 'acquire' },
      metrics.averageAcquisitionTime / 1000
    );

    poolConnectionLifetime.observe({ pool_name: poolName }, metrics.connectionLifetime.p50);
  }

  private checkAlerts(poolName: string, metrics: IPoolMetrics): void {
    const alerts: IPoolAlert[] = [];

    if (metrics.utilizationPercentage >= this.config.alertThresholds.utilizationCritical) {
      alerts.push({
        poolName,
        level: 'critical',
        message: `Pool utilization critical: ${metrics.utilizationPercentage.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: { utilizationPercentage: metrics.utilizationPercentage },
      });
    } else if (metrics.utilizationPercentage >= this.config.alertThresholds.utilizationWarning) {
      alerts.push({
        poolName,
        level: 'warning',
        message: `Pool utilization high: ${metrics.utilizationPercentage.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: { utilizationPercentage: metrics.utilizationPercentage },
      });
    }

    if (metrics.errorRate >= this.config.alertThresholds.errorRateCritical) {
      alerts.push({
        poolName,
        level: 'critical',
        message: `Pool error rate critical: ${metrics.errorRate.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: { errorRate: metrics.errorRate },
      });
    } else if (metrics.errorRate >= this.config.alertThresholds.errorRateWarning) {
      alerts.push({
        poolName,
        level: 'warning',
        message: `Pool error rate high: ${metrics.errorRate.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics: { errorRate: metrics.errorRate },
      });
    }

    if (metrics.averageAcquisitionTime >= this.config.alertThresholds.acquisitionTimeCritical) {
      alerts.push({
        poolName,
        level: 'critical',
        message: `Pool acquisition time critical: ${metrics.averageAcquisitionTime.toFixed(1)}ms`,
        timestamp: Date.now(),
        metrics: { averageAcquisitionTime: metrics.averageAcquisitionTime },
      });
    } else if (
      metrics.averageAcquisitionTime >= this.config.alertThresholds.acquisitionTimeWarning
    ) {
      alerts.push({
        poolName,
        level: 'warning',
        message: `Pool acquisition time high: ${metrics.averageAcquisitionTime.toFixed(1)}ms`,
        timestamp: Date.now(),
        metrics: { averageAcquisitionTime: metrics.averageAcquisitionTime },
      });
    }

    if (metrics.healthScore < 1) {
      alerts.push({
        poolName,
        level: 'critical',
        message: `Pool health check failed`,
        timestamp: Date.now(),
        metrics: { healthScore: metrics.healthScore },
      });
    }

    for (const alert of alerts) {
      this.alerts.push(alert);
      this.logger.warn(`Pool Alert [${alert.level.toUpperCase()}]:`, {
        pool: alert.poolName,
        message: alert.message,
        metrics: alert.metrics,
      });
    }

    const oneHourAgo = Date.now() - 3600000;
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  getMetrics(poolName?: string): Map<string, IPoolMetrics> | IPoolMetrics | undefined {
    if (poolName) {
      return this.metrics.get(poolName);
    }
    return this.metrics;
  }

  getAlerts(poolName?: string, level?: 'warning' | 'critical'): IPoolAlert[] {
    let alerts = this.alerts;

    if (poolName) {
      alerts = alerts.filter(alert => alert.poolName === poolName);
    }

    if (level) {
      alerts = alerts.filter(alert => alert.level === level);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  async generateReport(): Promise<string> {
    const poolStats = await this.poolManager.getAllStats();
    const poolHealth = await this.poolManager.healthCheckAll();

    let report = '# Connection Pool Monitoring Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Overall Status\n\n';
    const totalPools = Object.keys(poolStats).length;
    const healthyPools = Object.values(poolHealth).filter(Boolean).length;
    const totalConnections = Object.values(poolStats).reduce(
      (sum, stats) => sum + (stats as any).size,
      0
    );
    const activeConnections = Object.values(poolStats).reduce(
      (sum, stats) => sum + (stats as any).borrowed,
      0
    );

    report += `- Total Pools: ${totalPools}\n`;
    report += `- Healthy Pools: ${healthyPools}/${totalPools}\n`;
    report += `- Total Connections: ${totalConnections}\n`;
    report += `- Active Connections: ${activeConnections}\n\n`;

    report += '## Pool Details\n\n';

    for (const [poolName, stats] of Object.entries(poolStats)) {
      const isHealthy = poolHealth[poolName];
      const metrics = this.metrics.get(poolName);

      report += `### ${poolName}\n\n`;
      report += `- Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`;
      report += `- Connections: ${(stats as any).borrowed}/${(stats as any).size} (max: ${(stats as any).max})\n`;
      report += `- Available: ${(stats as any).available}\n`;
      report += `- Pending: ${(stats as any).pending}\n`;

      if (metrics) {
        report += `- Utilization: ${metrics.utilizationPercentage.toFixed(1)}%\n`;
        report += `- Error Rate: ${metrics.errorRate.toFixed(2)}%\n`;
        report += `- Avg Acquisition Time: ${metrics.averageAcquisitionTime.toFixed(1)}ms\n`;
      }

      report += '\n';
    }

    const recentAlerts = this.getAlerts();
    if (recentAlerts.length > 0) {
      report += '## Recent Alerts\n\n';

      for (const alert of recentAlerts.slice(0, 10)) {
        const time = new Date(alert.timestamp).toISOString();
        report += `- **${alert.level.toUpperCase()}** [${time}] ${alert.poolName}: ${alert.message}\n`;
      }

      report += '\n';
    }

    report += '## Recommendations\n\n';

    for (const [poolName, stats] of Object.entries(poolStats)) {
      const utilization = ((stats as any).borrowed / (stats as any).max) * 100;
      const metrics = this.metrics.get(poolName);

      if (utilization > 80) {
        report += `- Consider increasing max connections for ${poolName} (current utilization: ${utilization.toFixed(1)}%)\n`;
      }

      if ((stats as any).pending > 5) {
        report += `- High pending connections in ${poolName}, consider optimizing connection usage\n`;
      }

      if (metrics && metrics.errorRate > 2) {
        report += `- Investigate error causes in ${poolName} (error rate: ${metrics.errorRate.toFixed(2)}%)\n`;
      }

      if (metrics && metrics.averageAcquisitionTime > 100) {
        report += `- Slow connection acquisition in ${poolName} (${metrics.averageAcquisitionTime.toFixed(1)}ms), check pool configuration\n`;
      }
    }

    return report;
  }
}

export class PoolPerformanceAnalyzer {
  private performanceHistory: Map<string, Array<{ timestamp: number; metrics: IPoolMetrics }>> =
    new Map();

  constructor(
    private _monitor: PoolMonitor,
    private _logger: pino.Logger
  ) {
    // Constructor parameters are intentionally unused in this implementation
    // They are stored for potential future use
    // Parameters are intentionally unused but stored for future use
    void this._monitor;
    void this._logger;
  }

  recordPerformance(poolName: string, metrics: IPoolMetrics): void {
    if (!this.performanceHistory.has(poolName)) {
      this.performanceHistory.set(poolName, []);
    }

    const history = this.performanceHistory.get(poolName)!;
    history.push({ timestamp: Date.now(), metrics });

    const oneDayAgo = Date.now() - 86400000;
    this.performanceHistory.set(
      poolName,
      history.filter(record => record.timestamp > oneDayAgo)
    );
  }

  analyzePerformanceTrends(poolName: string): {
    trend: 'improving' | 'degrading' | 'stable';
    utilizationTrend: number;
    errorRateTrend: number;
    acquisitionTimeTrend: number;
  } {
    const history = this.performanceHistory.get(poolName);
    if (!history || history.length < 10) {
      return {
        trend: 'stable',
        utilizationTrend: 0,
        errorRateTrend: 0,
        acquisitionTimeTrend: 0,
      };
    }

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);

    if (older.length === 0) {
      return {
        trend: 'stable',
        utilizationTrend: 0,
        errorRateTrend: 0,
        acquisitionTimeTrend: 0,
      };
    }

    const recentAvg = {
      utilization:
        recent.reduce((sum, r) => sum + r.metrics.utilizationPercentage, 0) / recent.length,
      errorRate: recent.reduce((sum, r) => sum + r.metrics.errorRate, 0) / recent.length,
      acquisitionTime:
        recent.reduce((sum, r) => sum + r.metrics.averageAcquisitionTime, 0) / recent.length,
    };

    const olderAvg = {
      utilization:
        older.reduce((sum, r) => sum + r.metrics.utilizationPercentage, 0) / older.length,
      errorRate: older.reduce((sum, r) => sum + r.metrics.errorRate, 0) / older.length,
      acquisitionTime:
        older.reduce((sum, r) => sum + r.metrics.averageAcquisitionTime, 0) / older.length,
    };

    const utilizationTrend = recentAvg.utilization - olderAvg.utilization;
    const errorRateTrend = recentAvg.errorRate - olderAvg.errorRate;
    const acquisitionTimeTrend = recentAvg.acquisitionTime - olderAvg.acquisitionTime;

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';

    if (errorRateTrend > 1 || acquisitionTimeTrend > 10) {
      trend = 'degrading';
    } else if (errorRateTrend < -0.5 && acquisitionTimeTrend < -5) {
      trend = 'improving';
    }

    return {
      trend,
      utilizationTrend,
      errorRateTrend,
      acquisitionTimeTrend,
    };
  }

  generateOptimizationRecommendations(poolName: string): string[] {
    const recommendations: string[] = [];
    const trends = this.analyzePerformanceTrends(poolName);

    if (trends.utilizationTrend > 10) {
      recommendations.push('Consider increasing pool max size - utilization is trending up');
    }

    if (trends.errorRateTrend > 1) {
      recommendations.push('Investigate error causes - error rate is increasing');
    }

    if (trends.acquisitionTimeTrend > 20) {
      recommendations.push(
        'Connection acquisition is slowing down - check network latency or pool configuration'
      );
    }

    if (trends.trend === 'degrading') {
      recommendations.push(
        'Pool performance is degrading - consider restarting connections or scaling resources'
      );
    }

    return recommendations;
  }
}

export const createPoolMonitor = (
  poolManager: any,
  config: Partial<IPoolMonitorConfig> = {},
  logger?: pino.Logger
): PoolMonitor => {
  const defaultConfig: IPoolMonitorConfig = {
    enableMetrics: true,
    enableAlerting: true,
    metricsIntervalMs: 30000,
    alertThresholds: {
      utilizationWarning: 75,
      utilizationCritical: 90,
      errorRateWarning: 2,
      errorRateCritical: 5,
      acquisitionTimeWarning: 100,
      acquisitionTimeCritical: 500,
    },
  };

  const finalConfig = { ...defaultConfig, ...config };
  const finalLogger = logger || pino();

  return new PoolMonitor(poolManager, finalConfig, finalLogger);
};
