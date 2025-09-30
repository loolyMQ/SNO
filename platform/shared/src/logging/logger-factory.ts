import pino from 'pino';

export interface LoggerConfig {
  service: string;
  level?: string;
  environment?: string;
  version?: string;
  enablePretty?: boolean;
  enableColorize?: boolean;
  enableTimestamp?: boolean;
  customFields?: Record<string, any>;
}

export class LoggerFactory {
  private static loggers = new Map<string, pino.Logger>();

  static createLogger(config: LoggerConfig): pino.Logger {
    const key = `${config.service}-${config.environment || 'default'}`;

    if (this.loggers.has(key)) {
      return this.loggers.get(key)!;
    }

    const isDevelopment = (config.environment || process.env['NODE_ENV']) === 'development';
    const logLevel = config.level || process.env['LOG_LEVEL'] || (isDevelopment ? 'debug' : 'info');
    const enablePretty = config.enablePretty !== false && isDevelopment;
    const enableColorize = config.enableColorize !== false && isDevelopment;
    const enableTimestamp = config.enableTimestamp !== false;

    const pinoConfig: any = {
      level: logLevel,
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
      timestamp: enableTimestamp ? pino.stdTimeFunctions.isoTime : false,
      base: {
        service: config.service,
        version: config.version || process.env['npm_package_version'] || '1.0.0',
        environment: config.environment || process.env['NODE_ENV'] || 'development',
        ...config.customFields,
      },
    };

    if (enablePretty) {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: enableColorize,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };
    }

    const logger = pino(pinoConfig);

    this.loggers.set(key, logger);
    return logger;
  }

  static createServiceLogger(service: string, options: Partial<LoggerConfig> = {}): pino.Logger {
    return this.createLogger({
      service,
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '1.0.0',
      ...options,
    });
  }

  static createDevelopmentLogger(service: string): pino.Logger {
    return this.createLogger({
      service,
      environment: 'development',
      level: 'debug',
      enablePretty: true,
      enableColorize: true,
      enableTimestamp: true,
    });
  }

  static createProductionLogger(service: string): pino.Logger {
    return this.createLogger({
      service,
      environment: 'production',
      level: 'info',
      enablePretty: false,
      enableColorize: false,
      enableTimestamp: true,
    });
  }

  static createTestLogger(service: string): pino.Logger {
    return this.createLogger({
      service,
      environment: 'test',
      level: 'error',
      enablePretty: false,
      enableColorize: false,
      enableTimestamp: false,
    });
  }

  static createStructuredLogger(
    service: string,
    customFields: Record<string, any> = {}
  ): pino.Logger {
    return this.createLogger({
      service,
      environment: process.env['NODE_ENV'] || 'development',
      customFields: {
        ...customFields,
        timestamp: new Date().toISOString(),
        pid: process.pid,
      },
    });
  }

  static createChildLogger(
    parentLogger: pino.Logger,
    childFields: Record<string, any>
  ): pino.Logger {
    return parentLogger.child(childFields);
  }

  static createRequestLogger(service: string, requestId: string): pino.Logger {
    return this.createLogger({
      service,
      customFields: {
        requestId,
        type: 'request',
      },
    });
  }

  static createErrorLogger(service: string, errorId: string): pino.Logger {
    return this.createLogger({
      service,
      customFields: {
        errorId,
        type: 'error',
      },
    });
  }

  static createAuditLogger(service: string, userId?: string): pino.Logger {
    return this.createLogger({
      service,
      customFields: {
        userId,
        type: 'audit',
      },
    });
  }

  static createMetricsLogger(service: string): pino.Logger {
    return this.createLogger({
      service,
      customFields: {
        type: 'metrics',
      },
    });
  }

  static getLogger(service: string, environment?: string): pino.Logger | undefined {
    const key = `${service}-${environment || 'default'}`;
    return this.loggers.get(key);
  }

  static clearLoggers(): void {
    this.loggers.clear();
  }

  static getAllLoggers(): Map<string, pino.Logger> {
    return new Map(this.loggers);
  }

  static createLoggerWithConfig(
    config: LoggerConfig & {
      enableCorrelationId?: boolean;
      enableRequestId?: boolean;
      enableUserId?: boolean;
    }
  ): pino.Logger {
    const baseConfig = {
      service: config.service,
      environment: config.environment || process.env['NODE_ENV'] || 'development',
      level: config.level || process.env['LOG_LEVEL'] || 'info',
      version: config.version || process.env['npm_package_version'] || '1.0.0',
      enablePretty:
        config.enablePretty !== false &&
        (config.environment || process.env['NODE_ENV'] || 'development') === 'development',
      enableColorize:
        config.enableColorize !== false &&
        (config.environment || process.env['NODE_ENV'] || 'development') === 'development',
      enableTimestamp: config.enableTimestamp !== false,
      customFields: {
        ...config.customFields,
        ...(config.enableCorrelationId && { correlationId: this.generateCorrelationId() }),
        ...(config.enableRequestId && { requestId: this.generateRequestId() }),
        ...(config.enableUserId && { userId: 'system' }),
      },
    };

    return this.createLogger(baseConfig);
  }

  private static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
