import pino from 'pino';

export const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

export const PORT = process.env['PORT'] || 3004;
export const KAFKA_BROKERS = process.env['KAFKA_BROKERS'] || 'localhost:9092';

