// import { z } from 'zod'; // Not used
import pino from 'pino';
export class EnvironmentValidator {
    logger;
    constructor(logger) {
        this.logger = logger || pino();
        // Mark as intentionally unused for now
        void this.logger;
    }
    static create(logger) {
        return new EnvironmentValidator(logger);
    }
    validateEnvironment(requiredVars, optionalVars = []) {
        const errors = [];
        const warnings = [];
        const missing = [];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                errors.push(`Required environment variable ${varName} is not set`);
                missing.push(varName);
            }
        }
        for (const varName of optionalVars) {
            if (!process.env[varName]) {
                _warnings.push(`Optional environment variable ${varName} is not set`);
            }
        }
        this.validateSecurityDefaults(errors, _warnings);
        this.validateDatabaseConfig(errors, _warnings);
        this.validateJWTConfig(errors, _warnings);
        this.validateRedisConfig(errors, _warnings);
        this.validateKafkaConfig(errors, _warnings);
        return {
            isValid: errors.length === 0,
            errors,
            warnings: _warnings,
            missing,
        };
    }
    validateSecurityDefaults(errors, _warnings) {
        const insecureDefaults = [
            { var: 'JWT_SECRET', pattern: /^(dev-|test-|change-|default-)/i },
            { var: 'POSTGRES_PASSWORD', pattern: /^(password|123|admin|test)/i },
            { var: 'REDIS_PASSWORD', pattern: /^(password|123|admin|test)/i },
            { var: 'MEILI_MASTER_KEY', pattern: /^(dev-|test-|change-|default-)/i },
        ];
        for (const { var: varName, pattern } of insecureDefaults) {
            const value = process.env[varName];
            if (value && pattern.test(value)) {
                errors.push(`Insecure default value detected for ${varName}. Please use a secure value.`);
            }
        }
        if (process.env['NODE_ENV'] === 'production') {
            const prodInsecureVars = [
                'JWT_SECRET',
                'POSTGRES_PASSWORD',
                'REDIS_PASSWORD',
                'MEILI_MASTER_KEY',
            ];
            for (const varName of prodInsecureVars) {
                const value = process.env[varName];
                if (!value || value.length < 16) {
                    errors.push(`Production environment requires secure ${varName} (minimum 16 characters)`);
                }
            }
        }
    }
    validateDatabaseConfig(errors, _warnings) {
        const dbUrl = process.env['DATABASE_URL'];
        if (dbUrl) {
            if (dbUrl.includes('localhost') && process.env['NODE_ENV'] === 'production') {
                errors.push('Database URL contains localhost in production environment');
            }
            if (dbUrl.includes('password') && !dbUrl.includes('@')) {
                errors.push('Database URL appears to be malformed');
            }
        }
        const postgresPassword = process.env['POSTGRES_PASSWORD'];
        if (postgresPassword && postgresPassword.length < 12) {
            errors.push('POSTGRES_PASSWORD should be at least 12 characters long');
        }
    }
    validateJWTConfig(errors, _warnings) {
        const jwtSecret = process.env['JWT_SECRET'];
        if (jwtSecret) {
            if (jwtSecret.length < 32) {
                errors.push('JWT_SECRET should be at least 32 characters long');
            }
            if (jwtSecret === 'your-secret-key' || jwtSecret === 'change-me') {
                errors.push('JWT_SECRET is using a default insecure value');
            }
        }
        const jwtExpiresIn = process.env['JWT_EXPIRES_IN'];
        if (jwtExpiresIn) {
            const duration = this.parseDuration(jwtExpiresIn);
            if (duration < 3600) {
                _warnings.push('JWT_EXPIRES_IN is very short, consider increasing for better UX');
            }
            if (duration > 86400 * 7) {
                _warnings.push('JWT_EXPIRES_IN is very long, consider reducing for security');
            }
        }
    }
    validateRedisConfig(errors, _warnings) {
        const redisUrl = process.env['REDIS_URL'];
        if (redisUrl) {
            if (redisUrl.includes('localhost') && process.env['NODE_ENV'] === 'production') {
                errors.push('Redis URL contains localhost in production environment');
            }
        }
        const redisPassword = process.env['REDIS_PASSWORD'];
        if (redisPassword && redisPassword.length < 8) {
            _warnings.push('REDIS_PASSWORD should be at least 8 characters long');
        }
    }
    validateKafkaConfig(errors, _warnings) {
        const kafkaBrokers = process.env['KAFKA_BROKERS'];
        if (kafkaBrokers) {
            if (kafkaBrokers.includes('localhost') && process.env['NODE_ENV'] === 'production') {
                errors.push('Kafka brokers contain localhost in production environment');
            }
        }
    }
    parseDuration(duration) {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match)
            return 0;
        const value = parseInt(match[1] || '0');
        const unit = match[2] || 's';
        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            default:
                return 0;
        }
    }
    validateServiceEnvironment(serviceName) {
        const serviceConfigs = {
            'auth-service': {
                required: ['JWT_SECRET', 'DATABASE_URL', 'POSTGRES_PASSWORD'],
                optional: ['JWT_EXPIRES_IN', 'REFRESH_TOKEN_EXPIRES_IN', 'JWT_ALGORITHM'],
            },
            'graph-service': {
                required: ['DATABASE_URL', 'KAFKA_BROKERS'],
                optional: ['REDIS_URL', 'REDIS_PASSWORD'],
            },
            'search-service': {
                required: ['MEILI_MASTER_KEY', 'KAFKA_BROKERS'],
                optional: ['REDIS_URL', 'REDIS_PASSWORD'],
            },
            'jobs-service': {
                required: ['KAFKA_BROKERS'],
                optional: ['REDIS_URL', 'REDIS_PASSWORD', 'DATABASE_URL'],
            },
            'api-gateway': {
                required: [
                    'AUTH_SERVICE_URL',
                    'GRAPH_SERVICE_URL',
                    'SEARCH_SERVICE_URL',
                    'JOBS_SERVICE_URL',
                ],
                optional: ['RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS'],
            },
        };
        const config = serviceConfigs[serviceName];
        if (!config) {
            return {
                isValid: false,
                errors: [`Unknown service: ${serviceName}`],
                warnings: [],
                missing: [],
            };
        }
        return this.validateEnvironment(config.required, config.optional);
    }
    generateSecureDefaults() {
        return {
            JWT_SECRET: this.generateSecureString(64),
            POSTGRES_PASSWORD: this.generateSecureString(24),
            REDIS_PASSWORD: this.generateSecureString(16),
            MEILI_MASTER_KEY: this.generateSecureString(32),
            GF_SECURITY_ADMIN_PASSWORD: this.generateSecureString(16),
            SMTP_AUTH_PASSWORD: this.generateSecureString(16),
        };
    }
    generateSecureString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
//# sourceMappingURL=env-validator.js.map