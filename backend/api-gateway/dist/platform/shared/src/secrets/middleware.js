import { SecretsEngine } from './engine';
import pino from 'pino';
const logger = pino({
    level: process.env['LOG_LEVEL'] || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});
export class SecretsMiddleware {
    static instance;
    engine;
    constructor() {
        this.engine = SecretsEngine.getInstance();
    }
    static getInstance() {
        if (!SecretsMiddleware.instance) {
            SecretsMiddleware.instance = new SecretsMiddleware();
        }
        return SecretsMiddleware.instance;
    }
    middleware() {
        return (req, _res, next) => {
            req.secrets = this.engine;
            next();
        };
    }
    injectSecret(secretName, _secretType) {
        return (req, res, next) => {
            const service = req.headers['x-service']?.toString() || 'unknown';
            const environment = req.headers['x-environment']?.toString() || 'development';
            const secret = this.engine.getSecretByName(secretName, service, environment);
            if (!secret) {
                logger.warn({ secretName, service, environment }, 'Secret not found');
                return res.status(500).json({ error: 'Required secret not available' });
            }
            req[secretName] = secret.value;
            next();
            return; // Explicit return
        };
    }
    validateSecretAccess(requiredSecrets) {
        return (req, res, next) => {
            const service = req.headers['x-service']?.toString() || 'unknown';
            const environment = req.headers['x-environment']?.toString() || 'development';
            for (const secretName of requiredSecrets) {
                const secret = this.engine.getSecretByName(secretName, service, environment);
                if (!secret) {
                    logger.warn({ secretName, service, environment }, 'Required secret not found');
                    return res.status(500).json({
                        error: 'Required secrets not available',
                        missing: secretName,
                    });
                }
            }
            next();
            return; // Explicit return
        };
    }
}
//# sourceMappingURL=middleware.js.map