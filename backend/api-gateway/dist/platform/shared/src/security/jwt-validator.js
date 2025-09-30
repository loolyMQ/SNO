import crypto from 'crypto';
export class JWTSecurityValidator {
    static MIN_SECRET_LENGTH = 64;
    static RECOMMENDED_SECRET_LENGTH = 128;
    static ALLOWED_ALGORITHMS = [
        'HS256',
        'HS384',
        'HS512',
        'RS256',
        'RS384',
        'RS512',
    ];
    static WEAK_SECRETS = [
        'test-secret-key',
        'secret',
        'password',
        '123456',
        'admin',
        'jwt-secret',
        'your-secret-key',
        'change-me',
        'default-secret',
        'development-secret',
    ];
    static validateJWTConfig(config) {
        const errors = [];
        const warnings = [];
        if (!config.secret || config.secret.length < this.MIN_SECRET_LENGTH) {
            errors.push(`JWT secret must be at least ${this.MIN_SECRET_LENGTH} characters long`);
        }
        if (config.secret && config.secret.length < this.RECOMMENDED_SECRET_LENGTH) {
            warnings.push(`JWT secret should be at least ${this.RECOMMENDED_SECRET_LENGTH} characters for production`);
        }
        if (this.WEAK_SECRETS.includes(config.secret.toLowerCase())) {
            errors.push('JWT secret is too weak and commonly used');
        }
        if (config.secret.includes('change-me') || config.secret.includes('your-secret')) {
            errors.push('JWT secret contains placeholder text - must be changed in production');
        }
        if (!this.ALLOWED_ALGORITHMS.includes(config.algorithm)) {
            errors.push(`JWT algorithm must be one of: ${this.ALLOWED_ALGORITHMS.join(', ')}`);
        }
        if (!config.issuer || config.issuer.length < 3) {
            errors.push('JWT issuer must be at least 3 characters long');
        }
        if (!config.audience || config.audience.length < 3) {
            errors.push('JWT audience must be at least 3 characters long');
        }
        if (!this.isValidExpirationTime(config.expiresIn)) {
            errors.push('JWT expiration time must be a valid duration (e.g., 1h, 30m, 7d)');
        }
        if (!this.isValidExpirationTime(config.refreshExpiresIn)) {
            errors.push('JWT refresh expiration time must be a valid duration');
        }
        const accessTokenMs = this.parseExpirationTime(config.expiresIn);
        const refreshTokenMs = this.parseExpirationTime(config.refreshExpiresIn);
        if (accessTokenMs >= refreshTokenMs) {
            warnings.push('Refresh token should expire after access token');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    static generateSecureSecret(length = 128) {
        if (length < this.MIN_SECRET_LENGTH) {
            throw new Error(`Secret length must be at least ${this.MIN_SECRET_LENGTH} characters`);
        }
        return crypto.randomBytes(length).toString('hex');
    }
    static isSecretSecure(secret) {
        if (!secret || secret.length < this.MIN_SECRET_LENGTH) {
            return false;
        }
        if (this.WEAK_SECRETS.includes(secret.toLowerCase())) {
            return false;
        }
        if (secret.includes('change-me') || secret.includes('your-secret')) {
            return false;
        }
        const uniqueChars = new Set(secret).size;
        if (uniqueChars < 16) {
            return false;
        }
        return true;
    }
    static isValidExpirationTime(time) {
        const timeRegex = /^(\d+)([smhd])$/;
        return timeRegex.test(time);
    }
    static parseExpirationTime(time) {
        const timeRegex = /^(\d+)([smhd])$/;
        const match = time.match(timeRegex);
        if (!match)
            return 0;
        const value = parseInt(match[1] || '0');
        const unit = match[2] || 's';
        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }
    static getSecurityRecommendations() {
        return {
            secret: [
                'Use at least 128 characters for production',
                'Generate using cryptographically secure random generator',
                'Store in environment variables, never in code',
                'Rotate secrets regularly (every 90 days)',
                'Use different secrets for different environments',
            ],
            algorithm: [
                'Use HS256 for symmetric keys (simpler)',
                'Use RS256 for asymmetric keys (more secure)',
                'Avoid MD5 and SHA1 algorithms',
                'Consider ES256 for high-security applications',
            ],
            expiration: [
                'Access tokens: 15 minutes to 1 hour',
                'Refresh tokens: 7-30 days',
                'Use shorter expiration for sensitive operations',
                'Implement token refresh mechanism',
            ],
            general: [
                'Always use HTTPS in production',
                'Implement rate limiting on auth endpoints',
                'Log authentication attempts',
                'Use secure cookie settings',
                'Implement proper CORS policies',
            ],
        };
    }
}
//# sourceMappingURL=jwt-validator.js.map