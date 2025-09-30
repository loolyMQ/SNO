import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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

export class DatabaseSeedManager {
  private prisma: PrismaClient;
  private config: SeedConfig;
  private logger: any;

  constructor(prisma: PrismaClient, config: SeedConfig) {
    this.prisma = prisma;
    this.config = config;
    this.logger = console; // Simple logger for now
  }

  public async seed(): Promise<void> {
    this.logger.info('Starting centralized database seed...');
    this.logger.info({ environment: this.config.environment }, 'Environment');

    if (this.config.clearExisting) {
      await this.clearExistingData();
    }

    await this.seedUsers();

    this.logger.info('Centralized database seed completed successfully!');
  }

  private async clearExistingData(): Promise<void> {
    this.logger.info('Clearing existing data...');

    await this.prisma.refreshToken.deleteMany();
    await this.prisma.session.deleteMany();
    await this.prisma.user.deleteMany();

    this.logger.info('Existing data cleared');
  }

  private async seedUsers(): Promise<void> {
    this.logger.info('Seeding users...');

    for (const userData of this.config.users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const user = await this.prisma.user.upsert({
        where: { email: userData.email },
        update: {
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
        },
        create: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
        },
      });

      this.logger.info({ role: userData.role, email: user.email }, 'User seeded');
    }
  }

  public static createDevelopmentConfig(): SeedConfig {
    return {
      users: [
        {
          email: process.env['ADMIN_EMAIL'] || 'admin@science-map.dev',
          password: process.env['ADMIN_SEED_PASSWORD'] || 'dev-admin-123',
          name: 'Development Admin',
          role: 'ADMIN',
        },
        {
          email: process.env['USER_EMAIL'] || 'user@science-map.dev',
          password: process.env['USER_SEED_PASSWORD'] || 'dev-user-123',
          name: 'Development User',
          role: 'USER',
        },
        {
          email: process.env['MODERATOR_EMAIL'] || 'moderator@science-map.dev',
          password: process.env['MODERATOR_SEED_PASSWORD'] || 'dev-moderator-123',
          name: 'Development Moderator',
          role: 'MODERATOR',
        },
      ],
      clearExisting: true,
      environment: 'development',
    };
  }

  public static createStagingConfig(): SeedConfig {
    return {
      users: [
        {
          email: process.env['ADMIN_EMAIL'] || 'admin@science-map.staging',
          password: process.env['ADMIN_SEED_PASSWORD'] || 'staging-admin-123',
          name: 'Staging Admin',
          role: 'ADMIN',
        },
        {
          email: process.env['USER_EMAIL'] || 'user@science-map.staging',
          password: process.env['USER_SEED_PASSWORD'] || 'staging-user-123',
          name: 'Staging User',
          role: 'USER',
        },
      ],
      clearExisting: false,
      environment: 'staging',
    };
  }

  public static createProductionConfig(): SeedConfig {
    return {
      users: [
        {
          email: process.env['ADMIN_EMAIL'] || 'admin@science-map.com',
          password: process.env['ADMIN_SEED_PASSWORD'] || 'CHANGE-ME-IN-PRODUCTION',
          name: 'Production Admin',
          role: 'ADMIN',
        },
      ],
      clearExisting: false,
      environment: 'production',
    };
  }

  public static createTestConfig(): SeedConfig {
    return {
      users: [
        {
          email: 'test-admin@science-map.test',
          password: 'test-admin-123',
          name: 'Test Admin',
          role: 'ADMIN',
        },
        {
          email: 'test-user@science-map.test',
          password: 'test-user-123',
          name: 'Test User',
          role: 'USER',
        },
      ],
      clearExisting: true,
      environment: 'test',
    };
  }
}
