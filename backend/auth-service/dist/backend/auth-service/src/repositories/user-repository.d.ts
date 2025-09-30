import pino from 'pino';
import { PostgreSQLConnectionPool, RedisConnectionPool } from '@science-map/shared';
export interface IUser {
    id: string;
    email: string;
    name: string;
    password: string;
    role: 'USER' | 'ADMIN' | 'MODERATOR';
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
    login_count: number;
}
export declare class PooledUserRepository {
    private dbPool;
    private redisPool;
    private logger;
    constructor(dbPool: PostgreSQLConnectionPool, redisPool: RedisConnectionPool, logger: pino.Logger);
    findByEmail(email: string): Promise<IUser | null>;
    findById(id: string): Promise<IUser | null>;
    create(userData: Omit<IUser, 'id' | 'created_at' | 'updated_at' | 'login_count'>): Promise<IUser>;
    getUsersCount(): Promise<number>;
    private getCachedUser;
    private setCachedUser;
    invalidateUserCache(userId: string): Promise<void>;
}
//# sourceMappingURL=user-repository.d.ts.map