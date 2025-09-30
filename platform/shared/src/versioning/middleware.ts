import { Request, Response, NextFunction } from 'express';
import { VersioningEngine } from './engine';
import { VersioningConfig } from './types';
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

declare global {
  namespace Express {
    interface Request {
      versioning?: VersioningEngine;
      apiVersion?: string;
      versionedRequest?: Record<string, unknown>;
    }
  }
}

export class VersioningMiddleware {
  private static instance: VersioningMiddleware;
  private engine: VersioningEngine;

  private constructor(config: VersioningConfig) {
    this.engine = VersioningEngine.getInstance(config);
  }

  static getInstance(config: VersioningConfig): VersioningMiddleware {
    if (!VersioningMiddleware.instance) {
      VersioningMiddleware.instance = new VersioningMiddleware(config);
    }
    return VersioningMiddleware.instance;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        req.versioning = this.engine;

        const versionedRequest = this.engine.parseVersionFromRequest({
          path: req.path,
          headers: req.headers,
          query: req.query as Record<string, string | string[] | undefined>,
        });
        req.versionedRequest = versionedRequest as any;
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
      } catch (error) {
        logger.error({ error }, 'Versioning middleware error');
        res.status(400).json({
          error: 'Invalid API version',
          supportedVersions: this.engine.getSupportedVersions(),
        });
        return;
      }
    };
  }

  versionValidator(requiredVersions?: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
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
    return (req: Request, res: Response, next: NextFunction) => {
      const version = req.apiVersion;

      if (version && this.engine.isVersionDeprecated(version)) {
        const apiVersion = this.engine.getVersion(version);
        if (apiVersion) {
          res.set(
            'Warning',
            `299 - "API version ${version} is deprecated. Please migrate to a newer version."`
          );
        }
      }

      next();
    };
  }

  sunsetWarning() {
    return (req: Request, res: Response, next: NextFunction) => {
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
    return (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json;

      res.json = function (data: unknown) {
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

  private getDeprecationDate(version: string): string {
    const apiVersion = this.engine.getVersion(version);
    return apiVersion?.deprecationDate ? new Date(apiVersion.deprecationDate).toISOString() : '';
  }

  private getSunsetDate(version: string): string {
    const apiVersion = this.engine.getVersion(version);
    return apiVersion?.sunsetDate ? new Date(apiVersion.sunsetDate).toISOString() : '';
  }
}
