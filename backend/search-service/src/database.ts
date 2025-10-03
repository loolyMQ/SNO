import { PrismaClient } from '@prisma/client';

// Connection pooling configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/search',
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Connection pool monitoring
// let connectionCount = 0; // TODO: Implement connection monitoring
// const maxConnections = 10; // TODO: Implement connection monitoring

export const getPrismaClient = () => {
  // TODO: Implement connection pool monitoring
  return prisma;
};

export const closePrismaClient = async () => {
  await prisma.$disconnect();
  // connectionCount = 0; // TODO: Implement connection monitoring
};

// Health check for database connection
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (_error) {
    // Database health check failed
    return false;
  }
};

export default prisma;
