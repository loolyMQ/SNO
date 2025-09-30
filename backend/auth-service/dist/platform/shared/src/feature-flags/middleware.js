import { FeatureFlagEngine } from './engine';
import { CorrelationManager } from '../observability';
export class FeatureFlagMiddleware {
    static instance;
    engine;
    constructor() {
        this.engine = new FeatureFlagEngine();
    }
    static getInstance() {
        if (!FeatureFlagMiddleware.instance) {
            FeatureFlagMiddleware.instance = new FeatureFlagMiddleware();
        }
        return FeatureFlagMiddleware.instance;
    }
    getEngine() {
        return this.engine;
    }
    middleware() {
        return (req, _res, next) => {
            const context = {
                userId: req.headers['x-user-id'],
                sessionId: req.headers['x-session-id'],
                environment: process.env['NODE_ENV'] || 'development',
                customAttributes: {
                    ip: req.ip || '',
                    userAgent: req.headers['user-agent'] || '',
                    correlationId: CorrelationManager.extractCorrelationId(req.headers) || '',
                },
            };
            req.featureFlags = this.engine;
            req.featureFlagContext = context;
            next();
        };
    }
    isEnabled(flagKey, context) {
        const evaluation = this.engine.evaluate(flagKey, context);
        return Boolean(evaluation.value);
    }
    getValue(flagKey, context) {
        const evaluation = this.engine.evaluate(flagKey, context);
        return evaluation.value;
    }
}
//# sourceMappingURL=middleware.js.map