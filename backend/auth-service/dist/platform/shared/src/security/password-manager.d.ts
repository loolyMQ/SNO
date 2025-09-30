import { PasswordPolicy } from '../validation/password-validator';
export declare class SecurePasswordManager {
    static generateSecurePassword(length?: number): string;
    static validatePassword(password: string, policy?: PasswordPolicy): import("../validation/password-validator").PasswordValidationResult;
    static hashPassword(password: string, rounds?: number): Promise<string>;
    static verifyPassword(password: string, hash: string): Promise<boolean>;
    static generateEnvironmentPasswords(): {
        admin: string;
        user: string;
        moderator: string;
        database: string;
        redis: string;
        jwt: string;
        grafana: string;
        smtp: string;
        meilisearch: string;
    };
    static maskPassword(password: string): string;
    static isPasswordSecure(password: string, policy?: PasswordPolicy): boolean;
    static getPasswordStrength(password: string): {
        score: number;
        level: "weak" | "medium" | "strong" | "very-strong";
        feedback: string[];
    };
}
//# sourceMappingURL=password-manager.d.ts.map