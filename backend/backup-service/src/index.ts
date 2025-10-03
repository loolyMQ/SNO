import './tracing';
import { createApp } from './app';

const PORT = process.env.PORT || 3006;

async function startServer() {
  try {
    const { app, kafkaClient, logger } = createApp();
    
    await kafkaClient.connect();
    logger.info({
      service: 'backup-service',
      action: 'kafka-connect'
    }, 'Backup Service Kafka connected');

    app.listen(Number(PORT), () => {
      logger.info({
        service: 'backup-service',
        port: PORT,
        action: 'server-start'
      }, 'Backup Service running');
    });
  } catch (error) {
    const pino = await import('pino');
    const logger = pino.default({
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
      service: 'backup-service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: 'startup-error'
    }, 'Backup Service startup error');
    process.exit(1);
  }
}

startServer();
