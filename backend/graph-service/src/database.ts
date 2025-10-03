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


export default prisma;