export class ApiVersioning {
    static DEFAULT_CONFIG = {
        defaultVersion: 'v1',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: [],
        versioningStrategy: 'url',
        headerName: 'API-Version',
        queryParamName: 'version',
    };
    config;
    versions = new Map();
    constructor(config = {}) {
        this.config = { ...ApiVersioning.DEFAULT_CONFIG, ...config };
        this.initializeVersions();
    }
    initializeVersions() {
        for (const version of this.config.supportedVersions) {
            this.versions.set(version, {
                version,
                supported: true,
                deprecated: this.config.deprecatedVersions.includes(version),
            });
        }
    }
    static createVersioning(config = {}) {
        return new ApiVersioning(config);
    }
    static createUrlVersioning() {
        return new ApiVersioning({
            versioningStrategy: 'url',
            supportedVersions: ['v1', 'v2'],
            defaultVersion: 'v1',
        });
    }
    static createHeaderVersioning() {
        return new ApiVersioning({
            versioningStrategy: 'header',
            headerName: 'API-Version',
            supportedVersions: ['v1', 'v2'],
            defaultVersion: 'v1',
        });
    }
    static createQueryVersioning() {
        return new ApiVersioning({
            versioningStrategy: 'query',
            queryParamName: 'version',
            supportedVersions: ['v1', 'v2'],
            defaultVersion: 'v1',
        });
    }
    middleware() {
        return (req, res, next) => {
            const version = this.extractVersion(req);
            if (!version) {
                req.apiVersion = this.config.defaultVersion;
                return next();
            }
            if (!this.isVersionSupported(version)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'UNSUPPORTED_VERSION',
                        message: `API version ${version} is not supported`,
                        supportedVersions: this.config.supportedVersions,
                        defaultVersion: this.config.defaultVersion,
                    },
                });
            }
            if (this.isVersionDeprecated(version)) {
                res.set('Deprecation', `version=${version}`);
                res.set('Sunset', this.getSunsetDate(version) || '');
                if (this.getMigrationGuide(version)) {
                    res.set('Link', `<${this.getMigrationGuide(version)}>; rel="deprecation"`);
                }
            }
            req.apiVersion = version;
            next();
        };
    }
    extractVersion(req) {
        switch (this.config.versioningStrategy) {
            case 'url':
                return this.extractFromUrl(req);
            case 'header':
                return this.extractFromHeader(req);
            case 'query':
                return this.extractFromQuery(req);
            default:
                return null;
        }
    }
    extractFromUrl(req) {
        const pathSegments = req.path.split('/');
        const apiIndex = pathSegments.indexOf('api');
        if (apiIndex !== -1 && pathSegments[apiIndex + 1]) {
            return pathSegments[apiIndex + 1] || null;
        }
        return null;
    }
    extractFromHeader(req) {
        const headerName = this.config.headerName || 'API-Version';
        return req.headers[headerName.toLowerCase()] || null;
    }
    extractFromQuery(req) {
        const queryParamName = this.config.queryParamName || 'version';
        return req.query[queryParamName] || null;
    }
    isVersionSupported(version) {
        return this.config.supportedVersions.includes(version);
    }
    isVersionDeprecated(version) {
        return this.config.deprecatedVersions.includes(version);
    }
    getSunsetDate(version) {
        const versionInfo = this.versions.get(version);
        return versionInfo?.sunsetDate || null;
    }
    getMigrationGuide(version) {
        const versionInfo = this.versions.get(version);
        return versionInfo?.migrationGuide || null;
    }
    addVersion(version, config = {}) {
        this.versions.set(version, {
            version,
            supported: true,
            deprecated: false,
            ...config,
        });
    }
    deprecateVersion(version, sunsetDate, migrationGuide) {
        const versionInfo = this.versions.get(version);
        if (versionInfo) {
            versionInfo.deprecated = true;
            if (sunsetDate !== undefined) {
                versionInfo.sunsetDate = sunsetDate;
            }
            if (migrationGuide !== undefined) {
                versionInfo.migrationGuide = migrationGuide;
            }
            this.versions.set(version, versionInfo);
        }
    }
    getVersionInfo(version) {
        return this.versions.get(version) || null;
    }
    getAllVersions() {
        return Array.from(this.versions.values());
    }
    getSupportedVersions() {
        return this.config.supportedVersions;
    }
    getDeprecatedVersions() {
        return this.config.deprecatedVersions;
    }
    getDefaultVersion() {
        return this.config.defaultVersion;
    }
    createVersionedRoute(version, route) {
        switch (this.config.versioningStrategy) {
            case 'url':
                return `/api/${version}${route}`;
            case 'header':
            case 'query':
                return route;
            default:
                return route;
        }
    }
    createVersionedRoutes(route) {
        return this.config.supportedVersions.map(version => this.createVersionedRoute(version, route));
    }
    getVersionFromRequest(req) {
        return req.apiVersion || this.config.defaultVersion;
    }
}
//# sourceMappingURL=api-versioning.js.map