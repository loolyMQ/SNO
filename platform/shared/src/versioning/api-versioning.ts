import { Request, Response, NextFunction } from 'express';

export interface ApiVersion {
  version: string;
  supported: boolean;
  deprecated: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
}

export interface VersioningConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  versioningStrategy: 'url' | 'header' | 'query';
  headerName?: string;
  queryParamName?: string;
}

export class ApiVersioning {
  private static readonly DEFAULT_CONFIG: VersioningConfig = {
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
    deprecatedVersions: [],
    versioningStrategy: 'url',
    headerName: 'API-Version',
    queryParamName: 'version',
  };

  private config: VersioningConfig;
  private versions: Map<string, ApiVersion> = new Map();

  constructor(config: Partial<VersioningConfig> = {}) {
    this.config = { ...ApiVersioning.DEFAULT_CONFIG, ...config };
    this.initializeVersions();
  }

  private initializeVersions(): void {
    for (const version of this.config.supportedVersions) {
      this.versions.set(version, {
        version,
        supported: true,
        deprecated: this.config.deprecatedVersions.includes(version),
      });
    }
  }

  static createVersioning(config: Partial<VersioningConfig> = {}): ApiVersioning {
    return new ApiVersioning(config);
  }

  static createUrlVersioning(): ApiVersioning {
    return new ApiVersioning({
      versioningStrategy: 'url',
      supportedVersions: ['v1', 'v2'],
      defaultVersion: 'v1',
    });
  }

  static createHeaderVersioning(): ApiVersioning {
    return new ApiVersioning({
      versioningStrategy: 'header',
      headerName: 'API-Version',
      supportedVersions: ['v1', 'v2'],
      defaultVersion: 'v1',
    });
  }

  static createQueryVersioning(): ApiVersioning {
    return new ApiVersioning({
      versioningStrategy: 'query',
      queryParamName: 'version',
      supportedVersions: ['v1', 'v2'],
      defaultVersion: 'v1',
    });
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
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

  private extractVersion(req: Request): string | null {
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

  private extractFromUrl(req: Request): string | null {
    const pathSegments = req.path.split('/');
    const apiIndex = pathSegments.indexOf('api');

    if (apiIndex !== -1 && pathSegments[apiIndex + 1]) {
      return pathSegments[apiIndex + 1] || null;
    }

    return null;
  }

  private extractFromHeader(req: Request): string | null {
    const headerName = this.config.headerName || 'API-Version';
    return (req.headers[headerName.toLowerCase()] as string) || null;
  }

  private extractFromQuery(req: Request): string | null {
    const queryParamName = this.config.queryParamName || 'version';
    return (req.query[queryParamName] as string) || null;
  }

  private isVersionSupported(version: string): boolean {
    return this.config.supportedVersions.includes(version);
  }

  private isVersionDeprecated(version: string): boolean {
    return this.config.deprecatedVersions.includes(version);
  }

  private getSunsetDate(version: string): string | null {
    const versionInfo = this.versions.get(version);
    return versionInfo?.sunsetDate || null;
  }

  private getMigrationGuide(version: string): string | null {
    const versionInfo = this.versions.get(version);
    return versionInfo?.migrationGuide || null;
  }

  addVersion(version: string, config: Partial<ApiVersion> = {}): void {
    this.versions.set(version, {
      version,
      supported: true,
      deprecated: false,
      ...config,
    });
  }

  deprecateVersion(version: string, sunsetDate?: string, migrationGuide?: string): void {
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

  getVersionInfo(version: string): ApiVersion | null {
    return this.versions.get(version) || null;
  }

  getAllVersions(): ApiVersion[] {
    return Array.from(this.versions.values());
  }

  getSupportedVersions(): string[] {
    return this.config.supportedVersions;
  }

  getDeprecatedVersions(): string[] {
    return this.config.deprecatedVersions;
  }

  getDefaultVersion(): string {
    return this.config.defaultVersion;
  }

  createVersionedRoute(version: string, route: string): string {
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

  createVersionedRoutes(route: string): string[] {
    return this.config.supportedVersions.map(version => this.createVersionedRoute(version, route));
  }

  getVersionFromRequest(req: Request): string {
    return req.apiVersion || this.config.defaultVersion;
  }
}

declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}
