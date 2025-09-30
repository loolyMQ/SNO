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
export declare class AlertingSystem {
    private rules;
    private activeAlerts;
    private lastTriggered;
    private alertHandlers;
    constructor();
    private setupDefaultRules;
    addRule(rule: AlertRule): void;
    removeRule(ruleId: string): void;
    addAlertHandler(handler: (alert: Alert) => void): void;
    evaluateMetrics(metrics: Record<string, unknown>): Alert[];
    resolveAlert(alertId: string): boolean;
    getActiveAlerts(): Alert[];
    getAlertsBySeverity(severity: string): Alert[];
    clearResolvedAlerts(): void;
    getAlertSummary(): {
        total: number;
        bySeverity: Record<string, number>;
        recent: Alert[];
    };
}
//# sourceMappingURL=alerting.d.ts.map