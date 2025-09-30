import { PrismaClient } from '@prisma/client';
export interface SeedUser {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'USER' | 'MODERATOR';
}
export interface SeedConfig {
    users: SeedUser[];
    clearExisting: boolean;
    environment: 'development' | 'staging' | 'production' | 'test';
}
export declare class DatabaseSeedManager {
    private prisma;
    private config;
    private logger;
    constructor(prisma: PrismaClient, config: SeedConfig);
    seed(): Promise<void>;
    private clearExistingData;
    private seedUsers;
    static createDevelopmentConfig(): SeedConfig;
    static createStagingConfig(): SeedConfig;
    static createProductionConfig(): SeedConfig;
    static createTestConfig(): SeedConfig;
}
//# sourceMappingURL=seed-manager.d.ts.map