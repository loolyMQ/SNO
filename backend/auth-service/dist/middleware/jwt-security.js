"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtSecurityMiddleware = jwtSecurityMiddleware;
exports.validateJWTEnvironment = validateJWTEnvironment;
const shared_1 = require("@science-map/shared");
const config_1 = require("../config");
function jwtSecurityMiddleware() {
    return (req, res, next) => {
        try {
            const jwtConfig = new shared_1.SecureJWTConfig();
            if (!jwtConfig.isSecure()) {
                config_1.logger.warn('JWT configuration is not secure - check environment variables');
            }
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            next();
        }
        catch (error) {
            config_1.logger.error('JWT security validation failed:', error);
            res.status(500).json({
                error: 'JWT configuration error',
                message: 'Please check JWT_SECRET environment variable'
            });
        }
    };
}
function validateJWTEnvironment() {
    try {
        const validation = shared_1.SecureJWTConfig.validateEnvironment();
        if (!validation.isValid) {
            config_1.logger.error('JWT environment validation failed:', validation.errors);
            return false;
        }
        if (validation.warnings.length > 0) {
            config_1.logger.warn('JWT environment warnings:', validation.warnings);
        }
        return true;
    }
    catch (error) {
        config_1.logger.error('JWT environment validation error:', error);
        return false;
    }
}
//# sourceMappingURL=jwt-security.js.map