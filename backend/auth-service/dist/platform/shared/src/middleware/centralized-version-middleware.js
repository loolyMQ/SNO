import pino from 'pino';
import { VersionMiddleware } from '../versioning/version-middleware';
export class CentralizedVersionMiddleware {
    static instances = new Map();
    static logger;
    static initialize(logger) {
        this.logger =
            logger ||
                pino({
                    level: process.env['LOG_LEVEL'] || 'info',
                });
    }
    static createForService(config) {
        const serviceName = config.serviceName;
        if (this.instances.has(serviceName)) {
            return this.instances.get(serviceName);
        }
        const versionMiddlewareConfig = {
            serviceName: config.serviceName,
            version: config.version || process.env['npm_package_version'] || '1.0.0',
            buildTime: config.buildTime || new Date().toISOString(),
            gitCommit: config.gitCommit || process.env['GIT_COMMIT'] || 'unknown',
            gitBranch: config.gitBranch || process.env['GIT_BRANCH'] || 'unknown',
            environment: config.environment || process.env['NODE_ENV'] || 'development',
            dependencies: config.dependencies || this.getDefaultDependencies(),
            enableVersionHeader: config.enableVersionHeader !== false,
            enableCompatibilityCheck: config.enableCompatibilityCheck !== false,
            enableHealthCheck: config.enableHealthCheck !== false,
        };
        const versionMiddleware = VersionMiddleware.create(versionMiddlewareConfig, this.logger);
        this.instances.set(serviceName, versionMiddleware);
        return versionMiddleware;
    }
    static getDefaultDependencies() {
        return {
            express: '^4.18.0',
            pino: '^8.0.0',
            cors: '^2.8.5',
            helmet: '^7.0.0',
            compression: '^1.7.4',
        };
    }
    static getMiddleware(serviceName) {
        return (req, res, next) => {
            const versionMiddleware = this.instances.get(serviceName);
            if (versionMiddleware) {
                return versionMiddleware.middleware()(req, res, next);
            }
            next();
        };
    }
    static setupRoutes(app, serviceName) {
        const versionMiddleware = this.instances.get(serviceName);
        if (versionMiddleware) {
            versionMiddleware.setupRoutes(app);
        }
    }
    static getVersionInfo(serviceName) {
        const versionMiddleware = this.instances.get(serviceName);
        return versionMiddleware ? versionMiddleware.getVersionInfo() : null;
    }
    static getAllServices() {
        return Array.from(this.instances.keys());
    }
    static clearCache() {
        this.instances.clear();
    }
}
//# sourceMappingURL=centralized-version-middleware.js.map