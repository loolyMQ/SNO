export interface JWTConfig {
    secret: string;
    algorithm: string;
    expiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
}
export declare class JWTSecurityValidator {
    private static readonly MIN_SECRET_LENGTH;
    private static readonly RECOMMENDED_SECRET_LENGTH;
    private static readonly ALLOWED_ALGORITHMS;
    private static readonly WEAK_SECRETS;
    static validateJWTConfig(config: JWTConfig): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    static generateSecureSecret(length?: number): string;
    static isSecretSecure(secret: string): boolean;
    private static isValidExpirationTime;
    private static parseExpirationTime;
    static getSecurityRecommendations(): {
        secret: string[];
        algorithm: string[];
        expiration: string[];
        general: string[];
    };
}
//# sourceMappingURL=jwt-validator.d.ts.map