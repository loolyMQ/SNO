import express from 'express';
import { register } from 'prom-client';
import { DI_TOKENS, CommonMiddleware, DIContainer } from '@science-map/shared';
import { graphRequestDuration } from '../metrics';

export function setupMiddleware(app: express.Application, container: DIContainer, logger: { info: (m: string) => void; error: (m: string) => void }) {
  const commonMiddleware = CommonMiddleware.create(logger as any);
  commonMiddleware.setupAll(app, 'graph-service', {
    cors: {
      origin: String(((container.get(DI_TOKENS.CONFIG) as { [k: string]: unknown })['FRONTEND_URL']) ?? '*'),
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: 'Слишком много запросов к Graph API'
    },
    logging: {
      level: ((container.get(DI_TOKENS.CONFIG) as { [k: string]: unknown })['LOG_LEVEL'] as string) || 'info'
    }
  });

  app.use((_req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      graphRequestDuration.labels('http_request').observe(duration);
    });
    next();
  });
}

export function setupMetricsRoute(app: express.Application) {
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}


