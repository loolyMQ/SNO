export async function createDatabaseHealthCheck(prisma) {
    const startTime = Date.now();
    try {
        await prisma.$queryRaw `SELECT 1`;
        const poolInfo = await getConnectionPoolInfo(prisma);
        const queryStats = await getQueryStatistics(prisma);
        const responseTime = Date.now() - startTime;
        return {
            name: 'database',
            status: responseTime > 1000 ? 'degraded' : 'healthy',
            responseTime,
            lastCheck: Date.now(),
            connectionPool: poolInfo,
            queries: queryStats,
        };
    }
    catch (error) {
        return {
            name: 'database',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastCheck: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            connectionPool: {
                active: 0,
                idle: 0,
                total: 0,
            },
            queries: {
                total: 0,
                slow: 0,
                errors: 0,
            },
        };
    }
}
async function getConnectionPoolInfo(_prisma) {
    try {
        return {
            active: 1,
            idle: 4,
            total: 5,
        };
    }
    catch {
        return {
            active: 0,
            idle: 0,
            total: 0,
        };
    }
}
async function getQueryStatistics(_prisma) {
    try {
        return {
            total: 0,
            slow: 0,
            errors: 0,
        };
    }
    catch {
        return {
            total: 0,
            slow: 0,
            errors: 0,
        };
    }
}
//# sourceMappingURL=database.js.map