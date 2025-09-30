import { register } from 'prom-client';
import { DI_TOKENS, CommonMiddleware } from '@science-map/shared';
import { graphRequestDuration } from '../metrics';
export function setupMiddleware(app, container, logger) {
    const commonMiddleware = CommonMiddleware.create(logger);
    commonMiddleware.setupAll(app, 'graph-service', {
        cors: {
            origin: String((container.get(DI_TOKENS.CONFIG)['FRONTEND_URL']) ?? '*'),
            credentials: true
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: 200,
            message: 'Слишком много запросов к Graph API'
        },
        logging: {
            level: container.get(DI_TOKENS.CONFIG)['LOG_LEVEL'] || 'info'
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
export function setupMetricsRoute(app) {
    app.get('/metrics', async (_req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });
}
//# sourceMappingURL=middleware.js.map