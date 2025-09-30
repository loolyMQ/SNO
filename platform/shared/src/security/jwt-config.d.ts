import { JWTSecurityValidator, JWTConfig } from './jwt-validator';
export declare class SecureJWTConfig {
    private config;
    private validationResult;
    constructor();
    private loadConfigFromEnvironment;
    private validateConfiguration;
    getConfig(): JWTConfig;
    isSecure(): boolean;
    getSecurityRecommendations(): ReturnType<typeof JWTSecurityValidator.getSecurityRecommendations>;
    generateSecureSecret(length?: number): string;
    static validateEnvironment(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
}
//# sourceMappingURL=jwt-config.d.ts.map