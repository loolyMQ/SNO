import { Request, Response, NextFunction } from 'express';
import { SecretsEngine } from './engine';
import { SecretType } from './types';
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
      secrets?: SecretsEngine;
    }
  }
}

export class SecretsMiddleware {
  private static instance: SecretsMiddleware;
  private engine: SecretsEngine;

  private constructor() {
    this.engine = SecretsEngine.getInstance();
  }

  static getInstance(): SecretsMiddleware {
    if (!SecretsMiddleware.instance) {
      SecretsMiddleware.instance = new SecretsMiddleware();
    }
    return SecretsMiddleware.instance;
  }

  middleware() {
    return (req: Request, _res: Response, next: NextFunction) => {
      req.secrets = this.engine;
      next();
    };
  }

  injectSecret(secretName: string, _secretType: SecretType) {
    return (req: Request, res: Response, next: NextFunction) => {
      const service = req.headers['x-service']?.toString() || 'unknown';
      const environment = req.headers['x-environment']?.toString() || 'development';

      const secret = this.engine.getSecretByName(secretName, service, environment);
      if (!secret) {
        logger.warn({ secretName, service, environment }, 'Secret not found');
        return res.status(500).json({ error: 'Required secret not available' });
      }

      (req as any)[secretName] = secret.value;
      next();
      return; // Explicit return
    };
  }

  validateSecretAccess(requiredSecrets: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
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
