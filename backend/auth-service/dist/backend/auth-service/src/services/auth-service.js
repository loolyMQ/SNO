import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authOperationsTotal, activeUsers, tokenValidationDuration } from '../metrics';
import { ErrorRecoveryManager } from '@science-map/shared';
export class PooledAuthService {
    userRepository;
    eventService;
    logger;
    errorRecovery;
    constructor(userRepository, eventService, logger) {
        this.userRepository = userRepository;
        this.eventService = eventService;
        this.logger = logger;
        this.errorRecovery = ErrorRecoveryManager.create({
            maxRetries: 3,
            retryDelay: 1000,
            enableFallback: true,
            enableCircuitBreaker: true
        }, logger);
    }
    async register(email, password, name, role = 'USER') {
        try {
            const emailSchema = z.string().email();
            const passwordSchema = z.string().min(6);
            const nameSchema = z.string().min(2);
            emailSchema.parse(email);
            passwordSchema.parse(password);
            nameSchema.parse(name);
            const existingUser = await this.userRepository.findByEmail(email);
            if (existingUser) {
                authOperationsTotal.inc({ operation: 'register', status: 'error' });
                throw new Error('Пользователь с таким email уже существует');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await this.userRepository.create({
                email,
                password: hashedPassword,
                name,
                role
            });
            const tokens = this.generateTokens(user);
            await this.eventService.publishUserRegistered(user);
            authOperationsTotal.inc({ operation: 'register', status: 'success' });
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                ...tokens
            };
        }
        catch (error) {
            authOperationsTotal.inc({ operation: 'register', status: 'error' });
            this.logger.error({
                operation: 'register',
                error: error instanceof Error ? error.message : String(error)
            }, 'Registration failed, attempting recovery');
            return this.errorRecovery.executeWithRecovery(async () => {
                throw error;
            }, 'user-register', undefined, {
                success: false,
                error: 'Registration service temporarily unavailable',
                fallback: true
            });
        }
    }
    async login(email, password) {
        try {
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                authOperationsTotal.inc({ operation: 'login', status: 'error' });
                throw new Error('Неверные учетные данные');
            }
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                authOperationsTotal.inc({ operation: 'login', status: 'error' });
                throw new Error('Неверные учетные данные');
            }
            const tokens = this.generateTokens(user);
            await this.eventService.publishUserLogin(user);
            authOperationsTotal.inc({ operation: 'login', status: 'success' });
            activeUsers.inc();
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                ...tokens
            };
        }
        catch (error) {
            authOperationsTotal.inc({ operation: 'login', status: 'error' });
            throw error;
        }
    }
    async logout(userId) {
        try {
            await this.userRepository.invalidateUserCache(userId);
            await this.eventService.publishUserLogout(userId);
            authOperationsTotal.inc({ operation: 'logout', status: 'success' });
            activeUsers.dec();
            return { success: true };
        }
        catch (error) {
            authOperationsTotal.inc({ operation: 'logout', status: 'error' });
            throw error;
        }
    }
    async verifyToken(token) {
        const start = Date.now();
        try {
            const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-key';
            const decoded = jwt.verify(token, JWT_SECRET);
            const duration = Date.now() - start;
            tokenValidationDuration.observe(duration / 1000);
            return decoded;
        }
        catch (error) {
            const duration = Date.now() - start;
            tokenValidationDuration.observe(duration / 1000);
            throw error;
        }
    }
    generateTokens(user) {
        const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-key';
        const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '1h';
        const REFRESH_TOKEN_EXPIRES_IN = process.env['REFRESH_TOKEN_EXPIRES_IN'] || '7d';
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET is required');
        }
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
        const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
        return { token, refreshToken };
    }
    async getStatistics() {
        return {
            usersCount: await this.userRepository.getUsersCount()
        };
    }
}
//# sourceMappingURL=auth-service.js.map