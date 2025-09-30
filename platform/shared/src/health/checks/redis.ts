import { RedisHealthCheck } from '../types';
import { Redis } from 'ioredis';

export async function createRedisHealthCheck(redis: Redis): Promise<RedisHealthCheck> {
  const startTime = Date.now();

  try {
    await redis.ping();

    const memoryInfo = await getMemoryInfo(redis);

    const operationStats = await getOperationStatistics(redis);

    const responseTime = Date.now() - startTime;

    return {
      name: 'redis',
      status: responseTime > 500 ? 'degraded' : 'healthy',
      responseTime,
      lastCheck: Date.now(),
      memory: memoryInfo,
      operations: operationStats,
    };
  } catch (error: unknown) {
    return {
      name: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: Date.now(),
      error: error instanceof Error ? error.message : String(error),
      memory: {
        used: 0,
        peak: 0,
        fragmentation: 0,
      },
      operations: {
        total: 0,
        errors: 0,
      },
    };
  }
}

async function getMemoryInfo(redis: Redis): Promise<{
  used: number;
  peak: number;
  fragmentation: number;
}> {
  try {
    const info = await (redis as any).memory('usage');
    const stats = await (redis as any).memory('stats');

    return {
      used: parseInt(info) || 0,
      peak: parseInt((stats as any).peak_memory) || 0,
      fragmentation: parseFloat((stats as any).mem_fragmentation_ratio) || 0,
    };
  } catch {
    return {
      used: 0,
      peak: 0,
      fragmentation: 0,
    };
  }
}

async function getOperationStatistics(redis: Redis): Promise<{
  total: number;
  errors: number;
}> {
  try {
    const info = await redis.info('stats');
    const lines = info.split('\r\n');
    const total =
      lines.find(line => line.startsWith('total_commands_processed:'))?.split(':')[1] || '0';
    const errors =
      lines.find(line => line.startsWith('rejected_connections:'))?.split(':')[1] || '0';

    return {
      total: parseInt(total),
      errors: parseInt(errors),
    };
  } catch {
    return {
      total: 0,
      errors: 0,
    };
  }
}
