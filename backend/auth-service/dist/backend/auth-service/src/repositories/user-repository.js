export class PooledUserRepository {
    dbPool;
    redisPool;
    logger;
    constructor(dbPool, redisPool, logger) {
        this.dbPool = dbPool;
        this.redisPool = redisPool;
        this.logger = logger;
    }
    async findByEmail(email) {
        const cachedUser = await this.getCachedUser(`user:email:${email}`);
        if (cachedUser) {
            return cachedUser;
        }
        const dbClient = await this.dbPool.acquire();
        try {
            const result = await this.dbPool.query('SELECT id, email, name, password, role, created_at, updated_at, last_login, login_count FROM users WHERE email = $1', [email]);
            if (result.rows && result.rows.length > 0) {
                const user = result.rows[0];
                await this.setCachedUser(`user:email:${email}`, user, 1800);
                return user;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            const mockUsers = [
                {
                    id: '1',
                    email: process.env['ADMIN_EMAIL'] || 'admin@science-map.com',
                    name: 'Администратор',
                    password: process.env['ADMIN_SEED_PASSWORD'] || process.env['USER_SEED_PASSWORD'] || '$2b$10$8K4QIjQXJZ5F8gGqGzZxzOpgLjJVjJzG6m6JKjNhC3mSQxJj8oGrO',
                    role: 'ADMIN',
                    created_at: new Date('2023-01-01'),
                    updated_at: new Date('2023-01-01'),
                    login_count: 0
                },
                {
                    id: '2',
                    email: process.env['USER_EMAIL'] || 'user@science-map.com',
                    name: 'Пользователь',
                    password: process.env['ADMIN_SEED_PASSWORD'] || process.env['USER_SEED_PASSWORD'] || '$2b$10$8K4QIjQXJZ5F8gGqGzZxzOpgLjJVjJzG6m6JKjNhC3mSQxJj8oGrO',
                    role: 'USER',
                    created_at: new Date('2023-01-02'),
                    updated_at: new Date('2023-01-02'),
                    login_count: 0
                }
            ];
            const user = mockUsers.find(u => u.email === email) || null;
            if (user) {
                await this.setCachedUser(`user:email:${email}`, user, 3600);
                await this.setCachedUser(`user:id:${user.id}`, user, 3600);
            }
            return user;
        }
        finally {
            await this.dbPool.release(dbClient);
        }
    }
    async findById(id) {
        const cachedUser = await this.getCachedUser(`user:id:${id}`);
        if (cachedUser) {
            return cachedUser;
        }
        const dbClient = await this.dbPool.acquire();
        try {
            await new Promise(resolve => setTimeout(resolve, 30));
            const mockUsers = [
                {
                    id: '1',
                    email: process.env['ADMIN_EMAIL'] || 'admin@science-map.com',
                    name: 'Администратор',
                    password: process.env['ADMIN_SEED_PASSWORD'] || process.env['USER_SEED_PASSWORD'] || '$2b$10$8K4QIjQXJZ5F8gGqGzZxzOpgLjJVjJzG6m6JKjNhC3mSQxJj8oGrO',
                    role: 'ADMIN',
                    created_at: new Date('2023-01-01'),
                    updated_at: new Date('2023-01-01'),
                    login_count: 0
                },
                {
                    id: '2',
                    email: process.env['USER_EMAIL'] || 'user@science-map.com',
                    name: 'Пользователь',
                    password: process.env['ADMIN_SEED_PASSWORD'] || process.env['USER_SEED_PASSWORD'] || '$2b$10$8K4QIjQXJZ5F8gGqGzZxzOpgLjJVjJzG6m6JKjNhC3mSQxJj8oGrO',
                    role: 'USER',
                    created_at: new Date('2023-01-02'),
                    updated_at: new Date('2023-01-02'),
                    login_count: 0
                }
            ];
            const user = mockUsers.find(u => u.id === id) || null;
            if (user) {
                await this.setCachedUser(`user:id:${id}`, user, 3600);
                await this.setCachedUser(`user:email:${user.email}`, user, 3600);
            }
            return user;
        }
        finally {
            await this.dbPool.release(dbClient);
        }
    }
    async create(userData) {
        const dbClient = await this.dbPool.acquire();
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const user = {
                ...userData,
                id: String(Date.now()),
                created_at: new Date(),
                updated_at: new Date(),
                login_count: 0
            };
            await this.setCachedUser(`user:id:${user.id}`, user, 3600);
            await this.setCachedUser(`user:email:${user.email}`, user, 3600);
            return user;
        }
        finally {
            await this.dbPool.release(dbClient);
        }
    }
    async getUsersCount() {
        const dbClient = await this.dbPool.acquire();
        try {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 2;
        }
        finally {
            await this.dbPool.release(dbClient);
        }
    }
    async getCachedUser(key) {
        const redisClient = await this.redisPool.acquire();
        try {
            const cached = await redisClient.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            this.logger.error('Redis get error:', error);
            return null;
        }
        finally {
            await this.redisPool.release(redisClient);
        }
    }
    async setCachedUser(key, user, ttlSeconds) {
        const redisClient = await this.redisPool.acquire();
        try {
            await redisClient.setex(key, ttlSeconds, JSON.stringify(user));
        }
        catch (error) {
            this.logger.error('Redis set error:', error);
        }
        finally {
            await this.redisPool.release(redisClient);
        }
    }
    async invalidateUserCache(userId) {
        const redisClient = await this.redisPool.acquire();
        try {
            const keys = await redisClient.keys(`user:*:${userId}`);
            const user = await this.findById(userId);
            if (user) {
                keys.push(`user:email:${user.email}`);
            }
            if (keys.length > 0) {
                await redisClient.del(...keys);
            }
        }
        catch (error) {
            this.logger.error('Cache invalidation error:', error);
        }
        finally {
            await this.redisPool.release(redisClient);
        }
    }
}
//# sourceMappingURL=user-repository.js.map