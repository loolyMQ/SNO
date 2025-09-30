import { JWTSecurityValidator, JWTConfig } from './jwt-validator';
import pino from 'pino';

const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
});

export class SecureJWTConfig {
  private config: JWTConfig;
  private validationResult: ReturnType<typeof JWTSecurityValidator.validateJWTConfig>;

  constructor() {
    this.config = this.loadConfigFromEnvironment();
    this.validationResult = JWTSecurityValidator.validateJWTConfig(this.config);
    this.validateConfiguration();
  }

  private loadConfigFromEnvironment(): JWTConfig {
    const secret = process.env['JWT_SECRET'];

    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return {
      secret,
      algorithm: process.env['JWT_ALGORITHM'] || 'HS256',
      expiresIn: process.env['JWT_EXPIRES_IN'] || '1h',
      refreshExpiresIn: process.env['REFRESH_TOKEN_EXPIRES_IN'] || '7d',
      issuer: process.env['JWT_ISSUER'] || 'science-map',
      audience: process.env['JWT_AUDIENCE'] || 'science-map-users',
    };
  }

  private validateConfiguration(): void {
    if (!this.validationResult.isValid) {
      const errorMessage = [
        'JWT configuration is invalid:',
        ...this.validationResult.errors.map(error => `  - ${error}`),
      ].join('\n');

      throw new Error(errorMessage);
    }

    if (this.validationResult.warnings.length > 0) {
      logger.warn('JWT configuration warnings:');
      this.validationResult.warnings.forEach(warning => {
        logger.warn(`  - ${warning}`);
      });
    }
  }

  public getConfig(): JWTConfig {
    return { ...this.config };
  }

  public isSecure(): boolean {
    return JWTSecurityValidator.isSecretSecure(this.config.secret);
  }

  public getSecurityRecommendations(): ReturnType<
    typeof JWTSecurityValidator.getSecurityRecommendations
  > {
    return JWTSecurityValidator.getSecurityRecommendations();
  }

  public generateSecureSecret(length: number = 128): string {
    return JWTSecurityValidator.generateSecureSecret(length);
  }

  public static validateEnvironment(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    try {
      const config = new SecureJWTConfig();
      return {
        isValid: true,
        errors: [],
        warnings: config.validationResult.warnings,
      };
    } catch (error: unknown) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      };
    }
  }
}
