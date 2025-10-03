import { PrismaClient } from '@prisma/client';

// Connection pooling configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db',
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Connection pool monitoring
// let connectionCount = 0; // TODO: Implement connection monitoring
const maxConnections = 15; // Higher for jobs service

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
      return false;
    }
};

// Connection pool metrics
export const getConnectionPoolMetrics = () => {
  return {
    activeConnections: 0, // TODO: Implement connection monitoring
    maxConnections,
    availableConnections: maxConnections,
    utilizationRate: 0, // TODO: Implement connection monitoring
  };
};

export default prisma;
