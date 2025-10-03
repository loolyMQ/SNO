import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import pino from 'pino';

const logger = pino({
  name: 'auth-service-tracing',
  level: 'info'
});

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  sdk.start();
} catch (err) {
  logger.error({ error: err }, 'OTel start error');
}

process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
  } finally {
    process.exit(0);
  }
});


