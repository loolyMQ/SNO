import pino from 'pino';
export class ConnectionPoolManager {
    pools = new Map();
    logger;
    constructor(logger) {
        this.logger = logger || pino();
    }
    registerPool(name, pool) {
        this.pools.set(name, pool);
        this.logger.info(`Connection pool registered: ${name}`);
    }
    getPool(name) {
        return this.pools.get(name);
    }
    async getAllStats() {
        const stats = {};
        for (const [name, pool] of this.pools) {
            stats[name] = pool.getStats();
        }
        return stats;
    }
    async healthCheckAll() {
        const results = {};
        for (const [name, pool] of this.pools) {
            try {
                results[name] = await pool.healthCheck();
            }
            catch (error) {
                this.logger.error(`Health check failed for pool: ${name}`, error);
                results[name] = false;
            }
        }
        return results;
    }
    async shutdownAll() {
        this.logger.info('Shutting down all connection pools...');
        const shutdownPromises = Array.from(this.pools.entries()).map(async ([name, pool]) => {
            try {
                if (typeof pool.shutdown === 'function') {
                    await pool.shutdown();
                }
                else {
                    await pool.drain();
                }
                this.logger.info(`Pool shut down: ${name}`);
            }
            catch (error) {
                this.logger.error(`Error shutting down pool: ${name}`, error);
            }
        });
        await Promise.allSettled(shutdownPromises);
        this.pools.clear();
        this.logger.info('All connection pools shut down');
    }
}
//# sourceMappingURL=pool-manager.js.map