import './tracing';
import { createApp } from './app';

const PORT = process.env.PORT || 3010;

async function startServer() {
  try {
    const { app, kafkaClient, logger } = createApp();
    
    await kafkaClient.connect();
    logger.info({ service: 'secrets-service', action: 'kafka-connect' }, 'Secrets Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({ service: 'secrets-service', port: PORT, action: 'server-start' }, 'Secrets Service running');
    });
  } catch (error) {
    const logger = require('pino')({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
    
    logger.error({
      service: 'secrets-service',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Secrets Service startup error');
    process.exit(1);
  }
}

startServer();
