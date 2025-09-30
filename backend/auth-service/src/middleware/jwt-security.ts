
import { Request, Response, NextFunction } from 'express';
import { SecureJWTConfig } from '@science-map/shared';
import { logger } from '../utils/logger';

export function jwtSecurityMiddleware() {
  return (_req: Request, res: Response, next: NextFunction) => {
    try {
      const jwtConfig = new SecureJWTConfig();
      
      if (!jwtConfig.isSecure()) {
        logger.warn('JWT configuration is not secure - check environment variables');
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      next();
    } catch (error: unknown) {
      logger.error('JWT security validation failed:', error);
      res.status(500).json({ 
        error: 'JWT configuration error',
        message: 'Please check JWT_SECRET environment variable'
      });
    }
  };
}

export function validateJWTEnvironment(): boolean {
  try {
    const validation = SecureJWTConfig.validateEnvironment();
    
    if (!validation.isValid) {
      logger.error('JWT environment validation failed:', validation.errors);
      return false;
    }

    if (validation.warnings.length > 0) {
      logger.warn('JWT environment warnings:', validation.warnings);
    }

    return true;
  } catch (error) {
    logger.error('JWT environment validation error:', error);
    return false;
  }
}
