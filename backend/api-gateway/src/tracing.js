import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start().catch((err) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    service: 'api-gateway',
    action: 'otel-start-error'
  }, 'OTel start error');
});

process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
  } finally {
    process.exit(0);
  }
});


