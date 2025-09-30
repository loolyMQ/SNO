import { authRequestDuration } from '../metrics';
import { StandardizedErrorHandler, ErrorCode } from '@science-map/shared';
export class AuthController {
    authService;
    logger;
    constructor(authService, logger) {
        this.authService = authService;
        this.logger = logger;
    }
    async register(req, res) {
        const start = Date.now();
        try {
            const { email, password, name, role } = req.body;
            const result = await this.authService.register(email, password, name, role);
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'register' }, duration);
            res.status(201).json(result);
        }
        catch (error) {
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'register' }, duration);
            this.logger.error('Registration error:', error);
            const errorResponse = StandardizedErrorHandler.createErrorResponse(error, req.correlationId, { operation: 'register', email: req.body.email });
            res.status(errorResponse.error.httpStatus).json(errorResponse);
        }
    }
    async login(req, res) {
        const start = Date.now();
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'login' }, duration);
            res.json(result);
        }
        catch (error) {
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'login' }, duration);
            this.logger.error('Login error:', error);
            const errorResponse = StandardizedErrorHandler.createAuthError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', req.correlationId, { operation: 'login', email: req.body.email });
            res.status(errorResponse.error.httpStatus).json(errorResponse);
        }
    }
    async logout(req, res) {
        const start = Date.now();
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    error: 'Отсутствует токен авторизации'
                });
                return;
            }
            const token = authHeader.substring(7);
            const decoded = await this.authService.verifyToken(token);
            if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
                await this.authService.logout(decoded['userId']);
            }
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'logout' }, duration);
            res.json({ success: true });
        }
        catch (error) {
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'logout' }, duration);
            this.logger.error('Logout error:', error);
            const errorResponse = StandardizedErrorHandler.createAuthError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired token', req.correlationId, { operation: 'logout' });
            res.status(errorResponse.error.httpStatus).json(errorResponse);
        }
    }
    async verify(req, res) {
        const start = Date.now();
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    error: 'Отсутствует токен авторизации'
                });
                return;
            }
            const token = authHeader.substring(7);
            const decoded = await this.authService.verifyToken(token);
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'verify' }, duration);
            res.json({
                success: true,
                user: decoded
            });
        }
        catch (error) {
            const duration = (Date.now() - start) / 1000;
            authRequestDuration.observe({ operation: 'verify' }, duration);
            this.logger.error('Token verification error:', error);
            res.status(401).json({
                success: false,
                error: 'Неверный токен'
            });
        }
    }
    async statistics(_req, res) {
        try {
            const stats = await this.authService.getStatistics();
            res.json(stats);
        }
        catch (error) {
            this.logger.error('Statistics error:', error);
            res.status(500).json({
                success: false,
                error: 'Внутренняя ошибка сервера'
            });
        }
    }
}
//# sourceMappingURL=auth-controller.js.map