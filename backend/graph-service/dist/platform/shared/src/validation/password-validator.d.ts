export interface PasswordPolicy {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    forbiddenPatterns: string[];
}
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    score: number;
    level: 'weak' | 'medium' | 'strong' | 'very-strong';
    feedback: string[];
}
export declare class PasswordValidator {
    private static readonly DEFAULT_POLICY;
    static validatePassword(password: string, policy?: PasswordPolicy): PasswordValidationResult;
    static getPasswordStrength(password: string): {
        score: number;
        level: 'weak' | 'medium' | 'strong' | 'very-strong';
        feedback: string[];
    };
    static isPasswordSecure(password: string, policy?: PasswordPolicy): boolean;
    static createPolicy(overrides?: Partial<PasswordPolicy>): PasswordPolicy;
    static createWeakPolicy(): PasswordPolicy;
    static createStrongPolicy(): PasswordPolicy;
    static createDatabasePasswordPolicy(): PasswordPolicy;
    static createApiKeyPolicy(): PasswordPolicy;
    static createJwtSecretPolicy(): PasswordPolicy;
    static maskPassword(password: string): string;
    static validatePasswordComplexity(password: string): {
        hasUppercase: boolean;
        hasLowercase: boolean;
        hasNumbers: boolean;
        hasSpecialChars: boolean;
        length: number;
        uniqueChars: number;
    };
    private static calculatePasswordLevel;
}
//# sourceMappingURL=password-validator.d.ts.map