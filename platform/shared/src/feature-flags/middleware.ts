import { Request, Response, NextFunction } from 'express';
import { FeatureFlagEngine } from './engine';
import { FeatureFlagContext } from './types';
import { CorrelationManager } from '../observability';

export class FeatureFlagMiddleware {
  private static instance: FeatureFlagMiddleware;
  private engine: FeatureFlagEngine;

  constructor() {
    this.engine = new FeatureFlagEngine();
  }

  static getInstance(): FeatureFlagMiddleware {
    if (!FeatureFlagMiddleware.instance) {
      FeatureFlagMiddleware.instance = new FeatureFlagMiddleware();
    }
    return FeatureFlagMiddleware.instance;
  }

  getEngine(): FeatureFlagEngine {
    return this.engine;
  }

  middleware() {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const context: FeatureFlagContext = {
        userId: req.headers['x-user-id'] as string,
        sessionId: req.headers['x-session-id'] as string,
        environment: process.env['NODE_ENV'] || 'development',
        customAttributes: {
          ip: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
          correlationId: CorrelationManager.extractCorrelationId(req.headers) || '',
        },
      };

      req.featureFlags = this.engine;
      req.featureFlagContext = context;
      next();
    };
  }

  isEnabled(flagKey: string, context: FeatureFlagContext): boolean {
    const evaluation = this.engine.evaluate(flagKey, context);
    return Boolean(evaluation.value);
  }

  getValue(flagKey: string, context: FeatureFlagContext): unknown {
    const evaluation = this.engine.evaluate(flagKey, context);
    return evaluation.value;
  }
}

declare global {
  namespace Express {
    interface Request {
      featureFlags: FeatureFlagEngine;
      featureFlagContext: FeatureFlagContext;
    }
  }
}
