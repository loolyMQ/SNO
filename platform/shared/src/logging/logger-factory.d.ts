import pino from 'pino';
export interface LoggerConfig {
    service: string;
    level?: string;
    environment?: string;
    version?: string;
    enablePretty?: boolean;
    enableColorize?: boolean;
    enableTimestamp?: boolean;
    customFields?: Record<string, unknown>;
}
export declare class LoggerFactory {
    private static loggers;
    static createLogger(config: LoggerConfig): pino.Logger;
    static createServiceLogger(service: string, options?: Partial<LoggerConfig>): pino.Logger;
    static createDevelopmentLogger(service: string): pino.Logger;
    static createProductionLogger(service: string): pino.Logger;
    static createTestLogger(service: string): pino.Logger;
    static createStructuredLogger(service: string, customFields?: Record<string, unknown>): pino.Logger;
    static createChildLogger(parentLogger: pino.Logger, childFields: Record<string, unknown>): pino.Logger;
    static createRequestLogger(service: string, requestId: string): pino.Logger;
    static createErrorLogger(service: string, errorId: string): pino.Logger;
    static createAuditLogger(service: string, userId?: string): pino.Logger;
    static createMetricsLogger(service: string): pino.Logger;
    static getLogger(service: string, environment?: string): pino.Logger | undefined;
    static clearLoggers(): void;
    static getAllLoggers(): Map<string, pino.Logger>;
    static createLoggerWithConfig(config: LoggerConfig & {
        enableCorrelationId?: boolean;
        enableRequestId?: boolean;
        enableUserId?: boolean;
    }): pino.Logger;
    private static generateCorrelationId;
    private static generateRequestId;
}
//# sourceMappingURL=logger-factory.d.ts.map