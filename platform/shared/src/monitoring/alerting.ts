import pino from 'pino';

const logger = pino();

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: Record<string, unknown>) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export class AlertingSystem {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private alertHandlers: Array<(alert: Alert) => void> = [];

  constructor() {
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    this.addRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: metrics => (metrics['resources'] as any)?.memory?.percentage > 85,
      severity: 'high',
      message: 'Memory usage is above 85%',
      cooldown: 300,
    });

    this.addRule({
      id: 'critical_memory_usage',
      name: 'Critical Memory Usage',
      condition: metrics => (metrics['resources'] as any)?.memory?.percentage > 95,
      severity: 'critical',
      message: 'Memory usage is above 95%',
      cooldown: 60,
    });

    this.addRule({
      id: 'high_cpu_usage',
      name: 'High CPU Usage',
      condition: metrics => (metrics['resources'] as any)?.cpu?.usage > 80,
      severity: 'high',
      message: 'CPU usage is above 80%',
      cooldown: 300,
    });

    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: metrics => (metrics['errors'] as any)?.rate > 10,
      severity: 'high',
      message: 'Error rate is above 10%',
      cooldown: 180,
    });

    this.addRule({
      id: 'critical_error_rate',
      name: 'Critical Error Rate',
      condition: metrics => (metrics['errors'] as any)?.rate > 25,
      severity: 'critical',
      message: 'Error rate is above 25%',
      cooldown: 60,
    });

    this.addRule({
      id: 'high_response_time',
      name: 'High Response Time',
      condition: metrics => (metrics['latency'] as any)?.p95 > 5,
      severity: 'medium',
      message: '95th percentile response time is above 5 seconds',
      cooldown: 300,
    });

    this.addRule({
      id: 'critical_response_time',
      name: 'Critical Response Time',
      condition: metrics => (metrics['latency'] as any)?.p95 > 10,
      severity: 'high',
      message: '95th percentile response time is above 10 seconds',
      cooldown: 120,
    });

    this.addRule({
      id: 'low_throughput',
      name: 'Low Throughput',
      condition: metrics => (metrics['throughput'] as any)?.requestsPerSecond < 1,
      severity: 'medium',
      message: 'Request throughput is below 1 RPS',
      cooldown: 600,
    });
  }

  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  public addAlertHandler(handler: (alert: Alert) => void): void {
    this.alertHandlers.push(handler);
  }

  public evaluateMetrics(metrics: Record<string, unknown>): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const now = Date.now();

    for (const [ruleId, rule] of this.rules) {
      const lastTriggered = this.lastTriggered.get(ruleId) || 0;

      if (now - lastTriggered < rule.cooldown * 1000) {
        continue;
      }

      if (rule.condition(metrics)) {
        const alertId = `${ruleId}_${now}`;

        const alert: Alert = {
          id: alertId,
          ruleId,
          severity: rule.severity,
          message: rule.message,
          timestamp: now,
          resolved: false,
        };

        this.activeAlerts.set(alertId, alert);
        this.lastTriggered.set(ruleId, now);

        triggeredAlerts.push(alert);

        this.alertHandlers.forEach(handler => {
          try {
            handler(alert);
          } catch (error) {
            logger.error('Alert handler error:', error);
          }
        });
      }
    }

    return triggeredAlerts;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    return true;
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  public getAlertsBySeverity(severity: string): Alert[] {
    return this.getActiveAlerts().filter(alert => alert.severity === severity);
  }

  public clearResolvedAlerts(): void {
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.resolved) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  public getAlertSummary(): {
    total: number;
    bySeverity: Record<string, number>;
    recent: Alert[];
  } {
    const activeAlerts = this.getActiveAlerts();
    const bySeverity: Record<string, number> = {};

    activeAlerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    });

    const recent = activeAlerts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    return {
      total: activeAlerts.length,
      bySeverity,
      recent,
    };
  }
}
