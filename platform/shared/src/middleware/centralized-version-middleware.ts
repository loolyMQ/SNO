import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { VersionMiddleware, VersionMiddlewareConfig } from '../versioning/version-middleware';

export interface CentralizedVersionConfig {
  serviceName: string;
  version?: string;
  buildTime?: string;
  gitCommit?: string;
  gitBranch?: string;
  environment?: string;
  dependencies?: Record<string, string>;
  enableVersionHeader?: boolean;
  enableCompatibilityCheck?: boolean;
  enableHealthCheck?: boolean;
}

export class CentralizedVersionMiddleware {
  private static instances: Map<string, VersionMiddleware> = new Map();
  private static logger: pino.Logger;

  static initialize(logger?: pino.Logger): void {
    this.logger =
      logger ||
      pino({
        level: process.env['LOG_LEVEL'] || 'info',
      });
  }

  static createForService(config: CentralizedVersionConfig): VersionMiddleware {
    const serviceName = config.serviceName;

    if (this.instances.has(serviceName)) {
      return this.instances.get(serviceName)!;
    }

    const versionMiddlewareConfig: VersionMiddlewareConfig = {
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

  private static getDefaultDependencies(): Record<string, string> {
    return {
      express: '^4.18.0',
      pino: '^8.0.0',
      cors: '^2.8.5',
      helmet: '^7.0.0',
      compression: '^1.7.4',
    };
  }

  static getMiddleware(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const versionMiddleware = this.instances.get(serviceName);
      if (versionMiddleware) {
        return versionMiddleware.middleware()(req, res, next);
      }
      next();
    };
  }

  static setupRoutes(app: any, serviceName: string): void {
    const versionMiddleware = this.instances.get(serviceName);
    if (versionMiddleware) {
      versionMiddleware.setupRoutes(app);
    }
  }

  static getVersionInfo(serviceName: string) {
    const versionMiddleware = this.instances.get(serviceName);
    return versionMiddleware ? versionMiddleware.getVersionInfo() : null;
  }

  static getAllServices(): string[] {
    return Array.from(this.instances.keys());
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
