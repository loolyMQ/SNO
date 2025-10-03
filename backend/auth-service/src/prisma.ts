import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db',
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}


