import {
  ApiVersion,
  VersioningConfig,
  VersioningStrategy,
  VersionStatus,
  VersionedRequest,
  VersionedResponse,
  VersionCompatibility,
  VersionMetrics,
} from './types';
import pino from 'pino';

export class VersioningEngine {
  private static instance: VersioningEngine;
  private versions: Map<string, ApiVersion> = new Map();
  private config: VersioningConfig;
  private logger: pino.Logger;
  private metrics: Map<string, VersionMetrics> = new Map();

  constructor(config: VersioningConfig) {
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

  static getInstance(config?: VersioningConfig): VersioningEngine {
    if (!VersioningEngine.instance) {
      if (!config) {
        throw new Error('VersioningEngine requires config on first initialization');
      }
      VersioningEngine.instance = new VersioningEngine(config);
    }
    return VersioningEngine.instance;
  }

  addVersion(version: ApiVersion): void {
    this.versions.set(version.version, version);
    this.logger.info({ version: version.version }, 'API version added');
  }

  updateVersion(version: string, updates: Partial<ApiVersion>): void {
    const existing = this.versions.get(version);
    if (!existing) {
      throw new Error(`Version ${version} not found`);
    }

    const updated = { ...existing, ...updates };
    this.versions.set(version, updated);
    this.logger.info({ version }, 'API version updated');
  }

  getVersion(version: string): ApiVersion | undefined {
    return this.versions.get(version);
  }

  getAllVersions(): ApiVersion[] {
    return Array.from(this.versions.values());
  }

  getActiveVersions(): ApiVersion[] {
    return Array.from(this.versions.values()).filter(v => v.status === VersionStatus.ACTIVE);
  }

  getDeprecatedVersions(): ApiVersion[] {
    return Array.from(this.versions.values()).filter(v => v.status === VersionStatus.DEPRECATED);
  }

  parseVersionFromRequest(req: {
    path: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
  }): VersionedRequest {
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

  createVersionedResponse(version: string, data: unknown): VersionedResponse {
    const apiVersion = this.getVersion(version);
    if (!apiVersion) {
      throw new Error(`Version ${version} not found`);
    }

    const metadata: VersionedResponse['metadata'] = {
      version,
      status: apiVersion.status,
    };

    if (apiVersion.status === VersionStatus.DEPRECATED) {
      metadata.deprecationWarning = `API version ${version} is deprecated. Please migrate to a newer version.`;
    }

    if (apiVersion.status === VersionStatus.SUNSET) {
      metadata.sunsetWarning = `API version ${version} will be sunset on ${new Date(apiVersion.sunsetDate!).toISOString()}.`;
    }

    return {
      version,
      data,
      metadata,
    };
  }

  checkCompatibility(fromVersion: string, toVersion: string): VersionCompatibility {
    const from = this.getVersion(fromVersion);
    const to = this.getVersion(toVersion);

    if (!from || !to) {
      throw new Error('One or both versions not found');
    }

    const breakingChanges = this.findBreakingChanges(from, to);
    const migrationSteps = this.generateMigrationSteps(from, to);

    let compatibility: 'full' | 'partial' | 'none' = 'full';
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

  recordVersionUsage(version: string, userAgent?: string): void {
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

  getVersionMetrics(version?: string): VersionMetrics[] {
    if (version) {
      const metrics = this.metrics.get(version);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.metrics.values());
  }

  private extractVersion(req: {
    path: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
  }): string {
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

  private extractFromUrlPath(path: string): string {
    const match = path.match(/\/v(\d+(?:\.\d+)?)/);
    return match ? `v${match[1]}` : this.config.defaultVersion;
  }

  private extractFromHeader(headers: Record<string, string | string[] | undefined>): string {
    const headerValue = headers[this.config.versionHeader.toLowerCase()];
    return (
      (typeof headerValue === 'string' ? headerValue : undefined) || this.config.defaultVersion
    );
  }

  private extractFromQueryParam(query: Record<string, string | string[] | undefined>): string {
    const paramValue = query[this.config.versionParam];
    return (typeof paramValue === 'string' ? paramValue : undefined) || this.config.defaultVersion;
  }

  private extractFromAcceptHeader(headers: Record<string, string | string[] | undefined>): string {
    const acceptHeader = headers['accept'];
    const acceptHeaderStr = typeof acceptHeader === 'string' ? acceptHeader : undefined;
    if (!acceptHeaderStr) return this.config.defaultVersion;

    const match = acceptHeaderStr.match(
      new RegExp(`${this.config.acceptHeaderPrefix}(\\d+(?:\\.\\d+)?)`)
    );
    return match ? `v${match[1]}` : this.config.defaultVersion;
  }

  private buildVersionedPath(originalPath: string, version: string): string {
    if (this.config.strategy === VersioningStrategy.URL_PATH) {
      return originalPath.replace(/\/v\d+(?:\.\d+)?/, `/${version}`);
    }
    return originalPath;
  }

  private findBreakingChanges(from: ApiVersion, to: ApiVersion): string[] {
    const changes: string[] = [];

    if (from.breakingChanges.length > 0) {
      changes.push(...from.breakingChanges);
    }

    if (to.breakingChanges.length > 0) {
      changes.push(...to.breakingChanges);
    }

    return [...new Set(changes)];
  }

  private generateMigrationSteps(from: ApiVersion, to: ApiVersion): string[] {
    const steps: string[] = [];

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

  validateVersion(version: string): boolean {
    return this.versions.has(version);
  }

  isVersionDeprecated(version: string): boolean {
    const apiVersion = this.versions.get(version);
    return apiVersion?.status === VersionStatus.DEPRECATED;
  }

  isVersionSunset(version: string): boolean {
    const apiVersion = this.versions.get(version);
    return apiVersion?.status === VersionStatus.SUNSET;
  }

  getDefaultVersion(): string {
    return this.config.defaultVersion;
  }

  getSupportedVersions(): string[] {
    return this.config.supportedVersions;
  }

  getDeprecatedVersionStrings(): string[] {
    return this.config.deprecatedVersions;
  }

  getSunsetVersions(): string[] {
    return this.config.sunsetVersions;
  }
}
