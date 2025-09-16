export interface LoggerConfig {
  level?: string;
  service?: string;
  environment?: string;
  pretty?: boolean;
}

export interface Logger {
  info(message: string, data?: any): void;
  error(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

class SimpleLogger implements Logger {
  constructor(private config: LoggerConfig) {}

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const service = this.config.service || 'science-map';
    const env = this.config.environment || 'development';

    const logEntry = {
      timestamp,
      level,
      service,
      environment: env,
      message,
      ...data,
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('info', message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('error', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  debug(message: string, data?: any): void {
    if (this.config.level === 'debug') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export function createLogger(config: LoggerConfig = {}): Logger {
  return new SimpleLogger(config);
}

// Предустановленные логгеры для разных контекстов
export const httpLogger = createLogger({ service: 'http' });
export const businessLogger = createLogger({ service: 'business' });
export const metricsLogger = createLogger({ service: 'metrics' });
export const errorLogger = createLogger({ service: 'error', level: 'error' });

// Middleware для Express
export function createHttpLoggingMiddleware(logger: Logger = httpLogger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    logger.info('HTTP request started', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.on('finish', () => {
      const duration = Date.now() - start;

      logger.info('HTTP request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    });

    next();
  };
}
