import { VersioningStrategy, VersionStatus, } from './types';
import pino from 'pino';
export class VersioningEngine {
    static instance;
    versions = new Map();
    config;
    logger;
    metrics = new Map();
    constructor(config) {
        this.config = config;
        this.logger = pino({
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
    }
    static getInstance(config) {
        if (!VersioningEngine.instance) {
            if (!config) {
                throw new Error('VersioningEngine requires config on first initialization');
            }
            VersioningEngine.instance = new VersioningEngine(config);
        }
        return VersioningEngine.instance;
    }
    addVersion(version) {
        this.versions.set(version.version, version);
        this.logger.info({ version: version.version }, 'API version added');
    }
    updateVersion(version, updates) {
        const existing = this.versions.get(version);
        if (!existing) {
            throw new Error(`Version ${version} not found`);
        }
        const updated = { ...existing, ...updates };
        this.versions.set(version, updated);
        this.logger.info({ version }, 'API version updated');
    }
    getVersion(version) {
        return this.versions.get(version);
    }
    getAllVersions() {
        return Array.from(this.versions.values());
    }
    getActiveVersions() {
        return Array.from(this.versions.values()).filter(v => v.status === VersionStatus.ACTIVE);
    }
    getDeprecatedVersions() {
        return Array.from(this.versions.values()).filter(v => v.status === VersionStatus.DEPRECATED);
    }
    parseVersionFromRequest(req) {
        const version = this.extractVersion(req);
        const originalPath = req.path;
        const versionedPath = this.buildVersionedPath(originalPath, version);
        return {
            version,
            originalPath,
            versionedPath,
            strategy: this.config.strategy,
            headers: req.headers,
            query: req.query,
        };
    }
    createVersionedResponse(version, data) {
        const apiVersion = this.getVersion(version);
        if (!apiVersion) {
            throw new Error(`Version ${version} not found`);
        }
        const metadata = {
            version,
            status: apiVersion.status,
        };
        if (apiVersion.status === VersionStatus.DEPRECATED) {
            metadata.deprecationWarning = `API version ${version} is deprecated. Please migrate to a newer version.`;
        }
        if (apiVersion.status === VersionStatus.SUNSET) {
            metadata.sunsetWarning = `API version ${version} will be sunset on ${new Date(apiVersion.sunsetDate).toISOString()}.`;
        }
        return {
            version,
            data,
            metadata,
        };
    }
    checkCompatibility(fromVersion, toVersion) {
        const from = this.getVersion(fromVersion);
        const to = this.getVersion(toVersion);
        if (!from || !to) {
            throw new Error('One or both versions not found');
        }
        const breakingChanges = this.findBreakingChanges(from, to);
        const migrationSteps = this.generateMigrationSteps(from, to);
        let compatibility = 'full';
        if (breakingChanges.length > 0) {
            compatibility = breakingChanges.length > 3 ? 'none' : 'partial';
        }
        return {
            fromVersion,
            toVersion,
            breakingChanges,
            migrationSteps,
            compatibility,
        };
    }
    recordVersionUsage(version, userAgent) {
        const existing = this.metrics.get(version) || {
            version,
            requests: 0,
            errors: 0,
            averageResponseTime: 0,
            lastUsed: 0,
            userAgents: [],
        };
        existing.requests++;
        existing.lastUsed = Date.now();
        if (userAgent && !existing.userAgents.includes(userAgent)) {
            existing.userAgents.push(userAgent);
        }
        this.metrics.set(version, existing);
    }
    getVersionMetrics(version) {
        if (version) {
            const metrics = this.metrics.get(version);
            return metrics ? [metrics] : [];
        }
        return Array.from(this.metrics.values());
    }
    extractVersion(req) {
        switch (this.config.strategy) {
            case VersioningStrategy.URL_PATH:
                return this.extractFromUrlPath(req.path);
            case VersioningStrategy.HEADER:
                return this.extractFromHeader(req.headers);
            case VersioningStrategy.QUERY_PARAM:
                return this.extractFromQueryParam(req.query);
            case VersioningStrategy.ACCEPT_HEADER:
                return this.extractFromAcceptHeader(req.headers);
            default:
                return this.config.defaultVersion;
        }
    }
    extractFromUrlPath(path) {
        const match = path.match(/\/v(\d+(?:\.\d+)?)/);
        return match ? `v${match[1]}` : this.config.defaultVersion;
    }
    extractFromHeader(headers) {
        const headerValue = headers[this.config.versionHeader.toLowerCase()];
        return ((typeof headerValue === 'string' ? headerValue : undefined) || this.config.defaultVersion);
    }
    extractFromQueryParam(query) {
        const paramValue = query[this.config.versionParam];
        return (typeof paramValue === 'string' ? paramValue : undefined) || this.config.defaultVersion;
    }
    extractFromAcceptHeader(headers) {
        const acceptHeader = headers['accept'];
        const acceptHeaderStr = typeof acceptHeader === 'string' ? acceptHeader : undefined;
        if (!acceptHeaderStr)
            return this.config.defaultVersion;
        const match = acceptHeaderStr.match(new RegExp(`${this.config.acceptHeaderPrefix}(\\d+(?:\\.\\d+)?)`));
        return match ? `v${match[1]}` : this.config.defaultVersion;
    }
    buildVersionedPath(originalPath, version) {
        if (this.config.strategy === VersioningStrategy.URL_PATH) {
            return originalPath.replace(/\/v\d+(?:\.\d+)?/, `/${version}`);
        }
        return originalPath;
    }
    findBreakingChanges(from, to) {
        const changes = [];
        if (from.breakingChanges.length > 0) {
            changes.push(...from.breakingChanges);
        }
        if (to.breakingChanges.length > 0) {
            changes.push(...to.breakingChanges);
        }
        return [...new Set(changes)];
    }
    generateMigrationSteps(from, to) {
        const steps = [];
        if (from.breakingChanges.length > 0) {
            steps.push('Review breaking changes in the migration guide');
        }
        if (to.newFeatures.length > 0) {
            steps.push('Update your client to use new features');
        }
        if (to.bugFixes.length > 0) {
            steps.push('Test your integration with bug fixes');
        }
        return steps;
    }
    validateVersion(version) {
        return this.versions.has(version);
    }
    isVersionDeprecated(version) {
        const apiVersion = this.versions.get(version);
        return apiVersion?.status === VersionStatus.DEPRECATED;
    }
    isVersionSunset(version) {
        const apiVersion = this.versions.get(version);
        return apiVersion?.status === VersionStatus.SUNSET;
    }
    getDefaultVersion() {
        return this.config.defaultVersion;
    }
    getSupportedVersions() {
        return this.config.supportedVersions;
    }
    getDeprecatedVersionStrings() {
        return this.config.deprecatedVersions;
    }
    getSunsetVersions() {
        return this.config.sunsetVersions;
    }
}
//# sourceMappingURL=engine.js.map