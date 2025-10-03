import { injectable } from 'inversify';
import pino, { Logger, LoggerOptions } from 'pino';

export interface LoggerConfig {
  level: string;
  pretty: boolean;
  redact: string[];
}

@injectable()
export class LoggerService {
  private _logger: Logger;

  constructor() {
    const config: LoggerConfig = {
      level: process.env.LOG_LEVEL || 'info',
      pretty: process.env.NODE_ENV === 'development',
      redact: ['password', 'token', 'secret', 'key']
    };

    const options: LoggerOptions = {
      level: config.level,
      redact: config.redact,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
      },
    };

    if (config.pretty) {
      options.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      };
    }

    this._logger = pino(options);
  }

  info(message: string, meta?: unknown): void {
    this._logger.info(meta, message);
  }

  error(message: string, meta?: unknown): void {
    this._logger.error(meta, message);
  }

  warn(message: string, meta?: unknown): void {
    this._logger.warn(meta, message);
  }

  debug(message: string, meta?: unknown): void {
    this._logger.debug(meta, message);
  }

  getLogger(): Logger {
    return this._logger;
  }
}
