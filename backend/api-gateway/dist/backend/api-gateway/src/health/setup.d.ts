import { HealthChecker } from '@science-map/shared';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
export declare function setupHealthChecks(prisma: PrismaClient, redis: Redis): HealthChecker;
//# sourceMappingURL=setup.d.ts.map