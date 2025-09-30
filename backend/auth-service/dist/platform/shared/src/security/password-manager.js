// import crypto from 'crypto'; // Not used in this file
import bcrypt from 'bcrypt';
import { PasswordValidator } from '../validation/password-validator';
export class SecurePasswordManager {
    static generateSecurePassword(length = 16) {
        if (length < 8) {
            throw new Error('Password length must be at least 8 characters');
        }
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += specialChars[Math.floor(Math.random() * specialChars.length)];
        const allChars = uppercase + lowercase + numbers + specialChars;
        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        return password
            .split('')
            .sort(() => Math.random() - 0.5)
            .join('');
    }
    static validatePassword(password, policy) {
        return PasswordValidator.validatePassword(password, policy);
    }
    static async hashPassword(password, rounds = 12) {
        return bcrypt.hash(password, rounds);
    }
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    static generateEnvironmentPasswords() {
        return {
            admin: this.generateSecurePassword(16),
            user: this.generateSecurePassword(16),
            moderator: this.generateSecurePassword(16),
            database: this.generateSecurePassword(24),
            redis: this.generateSecurePassword(16),
            jwt: this.generateSecurePassword(64),
            grafana: this.generateSecurePassword(16),
            smtp: this.generateSecurePassword(16),
            meilisearch: this.generateSecurePassword(32),
        };
    }
    static maskPassword(password) {
        if (password.length <= 4) {
            return '*'.repeat(password.length);
        }
        return (password.substring(0, 2) +
            '*'.repeat(password.length - 4) +
            password.substring(password.length - 2));
    }
    static isPasswordSecure(password, policy) {
        return PasswordValidator.isPasswordSecure(password, policy);
    }
    static getPasswordStrength(password) {
        return PasswordValidator.getPasswordStrength(password);
    }
}
//# sourceMappingURL=password-manager.js.map