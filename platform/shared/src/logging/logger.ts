import pino from 'pino';
import { LogLevel, LogContext, ServiceConfig } from '../types';

export class Logger {
  private logger: pino.Logger;

  constructor(config: ServiceConfig) {
    const isDevelopment = config.environment === 'development';
    
    this.logger = pino({
      level: config.logLevel,
      name: config.name,
      formatters: {
        level: (label) => ({ level: label }),
      },
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
      serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
      },
    });
  }

  private createLogObject(level: LogLevel, message: string, context?: LogContext) {
    return {
      level,
      message,
      service: context?.service,
      requestId: context?.requestId,
      userId: context?.userId,
      correlationId: context?.correlationId,
      timestamp: new Date().toISOString(),
      ...context,
    };
  }

  fatal(message: string, context?: LogContext): void {
    this.logger.fatal(this.createLogObject('fatal', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const logObject = this.createLogObject('error', message, context);
    if (error) {
      (logObject as any).error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    this.logger.error(logObject);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.createLogObject('warn', message, context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.createLogObject('info', message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.createLogObject('debug', message, context));
  }

  trace(message: string, context?: LogContext): void {
    this.logger.trace(this.createLogObject('trace', message, context));
  }

  // Специальные методы для HTTP запросов
  request(method: string, url: string, context?: LogContext): void {
    this.info(`HTTP ${method} ${url}`, {
      service: context?.service || 'unknown',
      requestId: context?.requestId || undefined,
      userId: context?.userId || undefined,
      correlationId: context?.correlationId || undefined,
      httpMethod: method,
      httpUrl: url,
    } as LogContext);
  }

  response(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`HTTP ${method} ${url} ${statusCode}`, {
      service: context?.service || 'unknown',
      requestId: context?.requestId || undefined,
      userId: context?.userId || undefined,
      correlationId: context?.correlationId || undefined,
      httpMethod: method,
      httpUrl: url,
      httpStatusCode: statusCode,
      httpDuration: duration,
    } as LogContext);
  }

  // Метод для логирования бизнес-событий
  business(event: string, data?: any, context?: LogContext): void {
    this.info(`Business event: ${event}`, {
      service: context?.service || 'unknown',
      requestId: context?.requestId || undefined,
      userId: context?.userId || undefined,
      correlationId: context?.correlationId || undefined,
      businessEvent: event,
      businessData: data,
    } as LogContext);
  }

  // Метод для логирования метрик
  metric(name: string, value: number, labels?: Record<string, string>, context?: LogContext): void {
    this.info(`Metric: ${name}`, {
      service: context?.service || 'unknown',
      requestId: context?.requestId || undefined,
      userId: context?.userId || undefined,
      correlationId: context?.correlationId || undefined,
      metricName: name,
      metricValue: value,
      metricLabels: labels,
    } as LogContext);
  }
}

// Фабрика для создания логгеров
export function createLogger(config: ServiceConfig): Logger {
  return new Logger(config);
}

// Глобальный логгер (будет инициализирован при старте приложения)
let globalLogger: Logger | null = null;

export function getLogger(): Logger {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call setGlobalLogger first.');
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}
