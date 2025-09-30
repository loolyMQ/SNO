export class PasswordValidator {
    static DEFAULT_POLICY = {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        forbiddenPatterns: [
            'password',
            '123456',
            'admin',
            'user',
            'test',
            'change-me',
            'default',
            'secret',
            'root',
            'guest',
        ],
    };
    static validatePassword(password, policy = this.DEFAULT_POLICY) {
        const errors = [];
        const feedback = [];
        let score = 0;
        if (password.length < policy.minLength) {
            errors.push(`Password must be at least ${policy.minLength} characters long`);
        }
        else {
            score += 1;
        }
        if (password.length > policy.maxLength) {
            errors.push(`Password must be no more than ${policy.maxLength} characters long`);
        }
        if (password.length >= 8)
            score += 1;
        if (password.length >= 12)
            score += 1;
        if (password.length >= 16)
            score += 1;
        if (policy.requireUppercase) {
            if (!/[A-Z]/.test(password)) {
                errors.push('Password must contain at least one uppercase letter');
                feedback.push('Add uppercase letters');
            }
            else {
                score += 1;
            }
        }
        if (policy.requireLowercase) {
            if (!/[a-z]/.test(password)) {
                errors.push('Password must contain at least one lowercase letter');
                feedback.push('Add lowercase letters');
            }
            else {
                score += 1;
            }
        }
        if (policy.requireNumbers) {
            if (!/[0-9]/.test(password)) {
                errors.push('Password must contain at least one number');
                feedback.push('Add numbers');
            }
            else {
                score += 1;
            }
        }
        if (policy.requireSpecialChars) {
            if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
                errors.push('Password must contain at least one special character');
                feedback.push('Add special characters');
            }
            else {
                score += 1;
            }
        }
        for (const pattern of policy.forbiddenPatterns) {
            if (password.toLowerCase().includes(pattern.toLowerCase())) {
                errors.push(`Password cannot contain common patterns like "${pattern}"`);
            }
        }
        if (password.length < 8) {
            feedback.push('Use at least 8 characters');
        }
        const level = this.calculatePasswordLevel(score);
        return {
            isValid: errors.length === 0,
            errors,
            score,
            level,
            feedback,
        };
    }
    static getPasswordStrength(password) {
        const validation = this.validatePassword(password);
        return {
            score: validation.score,
            level: validation.level,
            feedback: validation.feedback,
        };
    }
    static isPasswordSecure(password, policy) {
        const validation = this.validatePassword(password, policy);
        return validation.isValid;
    }
    static createPolicy(overrides = {}) {
        return { ...this.DEFAULT_POLICY, ...overrides };
    }
    static createWeakPolicy() {
        return {
            minLength: 6,
            maxLength: 128,
            requireUppercase: false,
            requireLowercase: true,
            requireNumbers: false,
            requireSpecialChars: false,
            forbiddenPatterns: ['password', '123456'],
        };
    }
    static createStrongPolicy() {
        return {
            minLength: 16,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            forbiddenPatterns: [
                'password',
                '123456',
                'admin',
                'user',
                'test',
                'change-me',
                'default',
                'secret',
                'root',
                'guest',
                'qwerty',
                'abc123',
            ],
        };
    }
    static createDatabasePasswordPolicy() {
        return {
            minLength: 16,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            forbiddenPatterns: ['password', 'admin', 'root', 'test', 'database', 'db'],
        };
    }
    static createApiKeyPolicy() {
        return {
            minLength: 32,
            maxLength: 256,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: true,
            requireSpecialChars: false,
            forbiddenPatterns: [],
        };
    }
    static createJwtSecretPolicy() {
        return {
            minLength: 64,
            maxLength: 512,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: true,
            requireSpecialChars: true,
            forbiddenPatterns: [],
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
    static validatePasswordComplexity(password) {
        return {
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /[0-9]/.test(password),
            hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
            length: password.length,
            uniqueChars: new Set(password).size,
        };
    }
    static calculatePasswordLevel(score) {
        if (score < 4)
            return 'weak';
        if (score < 6)
            return 'medium';
        if (score < 8)
            return 'strong';
        return 'very-strong';
    }
}
//# sourceMappingURL=password-validator.js.map