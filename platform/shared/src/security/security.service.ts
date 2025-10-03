import { injectable } from 'inversify';
import { LoggerService } from '../logging/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@injectable()
export class SecurityService {
  private config: SecurityConfig;

  constructor(
    private _logger: LoggerService,
    private _metrics: MetricsService
  ) {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'default-secret',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
    };
    
    this._logger.info('SecurityService initialized');
  }

  public async hashPassword(password: string): Promise<string> {
    try {
      const hashed = await bcrypt.hash(password, this.config.bcryptRounds);
      this._metrics.incrementCounter('password_hash_total');
      return hashed;
    } catch (error) {
      this._logger.error('Password hashing failed', error);
      this._metrics.incrementCounter('password_hash_errors_total');
      throw error;
    }
  }

  public async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      this._metrics.incrementCounter('password_compare_total', { valid: isValid.toString() });
      return isValid;
    } catch (error) {
      this._logger.error('Password comparison failed', error);
      this._metrics.incrementCounter('password_compare_errors_total');
      throw error;
    }
  }

  public generateToken(payload: TokenPayload): string {
    try {
      const token = jwt.sign(payload, this.config.jwtSecret, {
        expiresIn: this.config.jwtExpiresIn,
        issuer: 'science-map-platform',
        audience: 'science-map-users'
      } as { audience: string });
      
      this._metrics.incrementCounter('token_generated_total');
      return token;
    } catch (error) {
      this._logger.error('Token generation failed', error);
      this._metrics.incrementCounter('token_generation_errors_total');
      throw error;
    }
  }

  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'science-map-platform',
        audience: 'science-map-users'
      }) as TokenPayload;
      
      this._metrics.incrementCounter('token_verified_total');
      return decoded;
    } catch (error) {
      this._logger.error('Token verification failed', error);
      this._metrics.incrementCounter('token_verification_errors_total');
      throw error;
    }
  }

  public generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  public generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  public sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  public validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
