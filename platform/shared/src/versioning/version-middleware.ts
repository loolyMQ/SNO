import { Request, Response, NextFunction } from 'express';
import { ServiceVersioning, ServiceVersion } from './service-versioning';
import { SemanticVersioning } from './semantic-versioning';
import pino from 'pino';

export interface VersionMiddlewareConfig {
  serviceName: string;
  version: string;
  buildTime: string;
  gitCommit?: string;
  gitBranch?: string;
  environment: string;
  dependencies: Record<string, string>;
  enableVersionHeader?: boolean;
  enableCompatibilityCheck?: boolean;
  enableHealthCheck?: boolean;
}

export class VersionMiddleware {
  private serviceVersioning: ServiceVersioning;
  private config: VersionMiddlewareConfig;
  private logger: pino.Logger;

  constructor(config: VersionMiddlewareConfig, logger?: pino.Logger) {
    this.config = config;
    this.logger =
      logger ||
      pino({
        level: process.env['LOG_LEVEL'] || 'info',
      });
    this.serviceVersioning = ServiceVersioning.create(this.logger);

    this.registerService();
  }

  static create(config: VersionMiddlewareConfig, logger?: pino.Logger): VersionMiddleware {
    return new VersionMiddleware(config, logger);
  }

  private registerService(): void {
    const serviceVersion: ServiceVersion = {
      name: this.config.serviceName,
      version: this.config.version,
      semantic: SemanticVersioning.parse(this.config.version),
      buildTime: this.config.buildTime,
      environment: this.config.environment,
      dependencies: this.config.dependencies,
    };

    if (this.config.gitCommit !== undefined) {
      serviceVersion.gitCommit = this.config.gitCommit;
    }
    if (this.config.gitBranch !== undefined) {
      serviceVersion.gitBranch = this.config.gitBranch;
    }

    this.serviceVersioning.registerService(serviceVersion);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.config.enableVersionHeader !== false) {
        res.set('X-Service-Name', this.config.serviceName);
        res.set('X-Service-Version', this.config.version);
        res.set('X-Service-Environment', this.config.environment);
        res.set('X-Build-Time', this.config.buildTime);

        if (this.config.gitCommit) {
          res.set('X-Git-Commit', this.config.gitCommit);
        }
        if (this.config.gitBranch) {
          res.set('X-Git-Branch', this.config.gitBranch);
        }
      }

      req.serviceVersion = {
        name: this.config.serviceName,
        version: this.config.version,
        environment: this.config.environment,
      };

      next();
    };
  }

  versionEndpoint() {
    return (_req: Request, res: Response) => {
      const versionInfo = this.serviceVersioning.getVersionInfo(this.config.serviceName);
      const health = this.serviceVersioning.getServiceHealth(this.config.serviceName);

      res.json({
        service: this.config.serviceName,
        version: this.config.version,
        semantic: versionInfo?.semantic,
        buildTime: this.config.buildTime,
        gitCommit: this.config.gitCommit,
        gitBranch: this.config.gitBranch,
        environment: this.config.environment,
        dependencies: this.config.dependencies,
        health: health,
        timestamp: new Date().toISOString(),
      });
    };
  }

  compatibilityEndpoint() {
    return (_req: Request, res: Response) => {
      const report = this.serviceVersioning.generateVersionReport();

      res.json({
        report: report,
        timestamp: new Date().toISOString(),
      });
    };
  }

  healthEndpoint() {
    return (_req: Request, res: Response) => {
      const health = this.serviceVersioning.getServiceHealth(this.config.serviceName);

      res.status(health.healthy ? 200 : 503).json({
        service: this.config.serviceName,
        version: this.config.version,
        healthy: health.healthy,
        isLatest: health.isLatest,
        isStable: health.isStable,
        issues: health.issues,
        timestamp: new Date().toISOString(),
      });
    };
  }

  setupRoutes(app: {
    get: (path: string, handler: (req: Request, res: Response) => void) => void;
  }): void {
    app.get('/version', this.versionEndpoint());

    if (this.config.enableCompatibilityCheck !== false) {
      app.get('/version/compatibility', this.compatibilityEndpoint());
    }

    if (this.config.enableHealthCheck !== false) {
      app.get('/version/health', this.healthEndpoint());
    }
  }

  getVersionInfo(): any {
    return {
      serviceName: this.config.serviceName,
      version: this.config.version,
      buildTime: this.config.buildTime,
      gitCommit: this.config.gitCommit,
      gitBranch: this.config.gitBranch,
      environment: this.config.environment,
      dependencies: this.config.dependencies,
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      serviceVersion?: {
        name: string;
        version: string;
        environment: string;
      };
    }
  }
}
