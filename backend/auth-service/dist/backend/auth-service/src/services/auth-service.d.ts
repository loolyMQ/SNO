import jwt from 'jsonwebtoken';
import pino from 'pino';
import { PooledUserRepository } from '../repositories/user-repository';
import { PooledEventService } from './event-service';
export declare class PooledAuthService {
    private userRepository;
    private eventService;
    private logger;
    private errorRecovery;
    constructor(userRepository: PooledUserRepository, eventService: PooledEventService, logger: pino.Logger);
    register(email: string, password: string, name: string, role?: 'USER' | 'ADMIN' | 'MODERATOR'): Promise<{
        success: boolean;
        error: string;
        fallback: boolean;
    } | {
        token: string;
        refreshToken: string;
        success: boolean;
        user: {
            id: string;
            email: string;
            name: string;
            role: "USER" | "ADMIN" | "MODERATOR";
        };
    }>;
    login(email: string, password: string): Promise<{
        token: string;
        refreshToken: string;
        success: boolean;
        user: {
            id: string;
            email: string;
            name: string;
            role: "USER" | "ADMIN" | "MODERATOR";
        };
    }>;
    logout(userId: string): Promise<{
        success: boolean;
    }>;
    verifyToken(token: string): Promise<string | jwt.JwtPayload>;
    private generateTokens;
    getStatistics(): Promise<{
        usersCount: number;
    }>;
}
//# sourceMappingURL=auth-service.d.ts.map