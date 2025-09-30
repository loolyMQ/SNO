export function createHealthCheckMiddleware(healthChecker, options = {}) {
    const { path = '/health', includeDetails = false } = options;
    return async (req, res, next) => {
        if (req.path !== path) {
            return next();
        }
        try {
            const result = await healthChecker.performHealthCheck();
            const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
            const responseData = {
                status: result.status,
                timestamp: result.timestamp,
                uptime: result.uptime,
                version: result.version,
                environment: result.environment,
            };
            if (includeDetails || req.query['details'] === 'true') {
                responseData['checks'] = result['checks'];
                responseData['metadata'] = result['metadata'];
            }
            if (req.query['check']) {
                const checkName = req.query['check'];
                const check = result['checks'].find((c) => c.name === checkName);
                if (check) {
                    responseData['check'] = check;
                }
                else {
                    return res.status(404).json({ error: 'Check not found' });
                }
            }
            res.status(statusCode).json(responseData);
        }
        catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error),
            });
        }
    };
}
export function createReadinessMiddleware(healthChecker, options = {}) {
    const { path = '/ready', includeDetails = false } = options;
    return async (req, res, next) => {
        if (req.path !== path) {
            return next();
        }
        try {
            const result = await healthChecker.performHealthCheck();
            const criticalChecks = result.checks.filter(check => check.name === 'database' || check.name === 'redis');
            const isReady = criticalChecks.every(check => check.status === 'healthy');
            const statusCode = isReady ? 200 : 503;
            const responseData = {
                ready: isReady,
                timestamp: result.timestamp,
                criticalChecks: criticalChecks.length,
                healthyChecks: criticalChecks.filter(c => c.status === 'healthy').length,
            };
            if (includeDetails || req.query['details'] === 'true') {
                responseData['checks'] = criticalChecks;
            }
            res.status(statusCode).json(responseData);
        }
        catch (error) {
            res.status(500).json({
                ready: false,
                timestamp: Date.now(),
                error: error instanceof Error ? error.message : String(error),
            });
        }
    };
}
export function createLivenessMiddleware(options = {}) {
    const { path = '/live' } = options;
    return (req, res, next) => {
        if (req.path !== path) {
            return next();
        }
        res.status(200).json({
            alive: true,
            timestamp: Date.now(),
            uptime: process.uptime(),
            pid: process.pid,
        });
    };
}
//# sourceMappingURL=middleware.js.map