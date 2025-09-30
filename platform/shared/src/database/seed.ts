import { PrismaClient } from '@prisma/client';
import { DatabaseSeedManager } from './seed-manager';
import pino from 'pino';

const logger = pino();

const prisma = new PrismaClient();

async function main() {
  const environment = (process.env['NODE_ENV'] || 'development') as
    | 'development'
    | 'staging'
    | 'production'
    | 'test';

  let config;

  switch (environment) {
    case 'development':
      config = DatabaseSeedManager.createDevelopmentConfig();
      break;
    case 'staging':
      config = DatabaseSeedManager.createStagingConfig();
      break;
    case 'production':
      config = DatabaseSeedManager.createProductionConfig();
      break;
    case 'test':
      config = DatabaseSeedManager.createTestConfig();
      break;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }

  const seedManager = new DatabaseSeedManager(prisma, config);
  await seedManager.seed();
}

main()
  .catch(e => {
    logger.error('❌ Centralized seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
