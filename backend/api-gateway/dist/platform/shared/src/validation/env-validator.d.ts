import pino from 'pino';
export interface EnvironmentValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    missing: string[];
}
export declare class EnvironmentValidator {
    private logger;
    constructor(logger?: pino.Logger);
    static create(logger?: pino.Logger): EnvironmentValidator;
    validateEnvironment(requiredVars: string[], optionalVars?: string[]): EnvironmentValidationResult;
    private validateSecurityDefaults;
    private validateDatabaseConfig;
    private validateJWTConfig;
    private validateRedisConfig;
    private validateKafkaConfig;
    private parseDuration;
    validateServiceEnvironment(serviceName: string): EnvironmentValidationResult;
    generateSecureDefaults(): Record<string, string>;
    private generateSecureString;
}
//# sourceMappingURL=env-validator.d.ts.map