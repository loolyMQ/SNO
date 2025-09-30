import { VersioningEngine } from './engine';
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
export class VersioningMiddleware {
    static instance;
    engine;
    constructor(config) {
        this.engine = VersioningEngine.getInstance(config);
    }
    static getInstance(config) {
        if (!VersioningMiddleware.instance) {
            VersioningMiddleware.instance = new VersioningMiddleware(config);
        }
        return VersioningMiddleware.instance;
    }
    middleware() {
        return (req, res, next) => {
            try {
                req.versioning = this.engine;
                const versionedRequest = this.engine.parseVersionFromRequest({
                    path: req.path,
                    headers: req.headers,
                    query: req.query,
                });
                req.versionedRequest = versionedRequest;
                req.apiVersion = versionedRequest.version;
                this.engine.recordVersionUsage(versionedRequest.version, req.headers['user-agent']);
                if (this.engine.isVersionDeprecated(versionedRequest.version)) {
                    res.set('X-API-Deprecated', 'true');
                    res.set('X-API-Deprecation-Date', this.getDeprecationDate(versionedRequest.version));
                }
                if (this.engine.isVersionSunset(versionedRequest.version)) {
                    res.set('X-API-Sunset', 'true');
                    res.set('X-API-Sunset-Date', this.getSunsetDate(versionedRequest.version));
                }
                res.set('X-API-Version', versionedRequest.version);
                res.set('X-API-Strategy', versionedRequest.strategy);
                next();
            }
            catch (error) {
                logger.error({ error }, 'Versioning middleware error');
                res.status(400).json({
                    error: 'Invalid API version',
                    supportedVersions: this.engine.getSupportedVersions(),
                });
                return;
            }
        };
    }
    versionValidator(requiredVersions) {
        return (req, res, next) => {
            const version = req.apiVersion;
            if (!version) {
                res.status(400).json({
                    error: 'API version is required',
                    supportedVersions: this.engine.getSupportedVersions(),
                });
                return;
            }
            if (!this.engine.validateVersion(version)) {
                res.status(400).json({
                    error: 'Unsupported API version',
                    version,
                    supportedVersions: this.engine.getSupportedVersions(),
                });
                return;
            }
            if (requiredVersions && !requiredVersions.includes(version)) {
                res.status(400).json({
                    error: 'API version not allowed for this endpoint',
                    version,
                    requiredVersions,
                });
                return;
            }
            next();
        };
    }
    deprecationWarning() {
        return (req, res, next) => {
            const version = req.apiVersion;
            if (version && this.engine.isVersionDeprecated(version)) {
                const apiVersion = this.engine.getVersion(version);
                if (apiVersion) {
                    res.set('Warning', `299 - "API version ${version} is deprecated. Please migrate to a newer version."`);
                }
            }
            next();
        };
    }
    sunsetWarning() {
        return (req, res, next) => {
            const version = req.apiVersion;
            if (version && this.engine.isVersionSunset(version)) {
                const apiVersion = this.engine.getVersion(version);
                if (apiVersion && apiVersion.sunsetDate) {
                    const sunsetDate = new Date(apiVersion.sunsetDate).toISOString();
                    res.set('Warning', `299 - "API version ${version} will be sunset on ${sunsetDate}."`);
                }
            }
            next();
        };
    }
    versionedResponse() {
        return (req, res, next) => {
            const originalJson = res.json;
            res.json = function (data) {
                const version = req.apiVersion;
                if (version && req.versioning) {
                    const versionedResponse = req.versioning.createVersionedResponse(version, data);
                    return originalJson.call(this, versionedResponse);
                }
                return originalJson.call(this, data);
            };
            next();
        };
    }
    getDeprecationDate(version) {
        const apiVersion = this.engine.getVersion(version);
        return apiVersion?.deprecationDate ? new Date(apiVersion.deprecationDate).toISOString() : '';
    }
    getSunsetDate(version) {
        const apiVersion = this.engine.getVersion(version);
        return apiVersion?.sunsetDate ? new Date(apiVersion.sunsetDate).toISOString() : '';
    }
}
//# sourceMappingURL=middleware.js.map