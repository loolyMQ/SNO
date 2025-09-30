import { QueryExecutor } from './query-executor';
export class QueryOptimizer {
    _pool;
    _config;
    _logger;
    executor;
    constructor(_pool, _config, _logger) {
        this._pool = _pool;
        this._config = _config;
        this._logger = _logger;
        // Constructor parameters are stored for potential future use
        // Parameters are intentionally unused but stored for future use
        void this._pool;
        void this._config;
        void this._logger;
        const executorConfig = {
            enableOptimization: _config.enableQueryRewriting,
            enableCaching: true,
            enableMetrics: true,
            slowQueryThreshold: _config.slowQueryThreshold,
            verySlowQueryThreshold: _config.verySlowQueryThreshold,
        };
        this.executor = new QueryExecutor(_pool, executorConfig, _logger);
    }
    async executeOptimized(query, params = [], options = {}) {
        return this.executor.executeOptimized(query, params, options);
    }
    getCacheStats() {
        return this.executor.getCacheStats();
    }
    getMetrics() {
        return this.executor.getMetrics();
    }
    clearCache() {
        this.executor.clearCache();
    }
}
export const createQueryOptimizer = (pool, config, logger) => {
    return new QueryOptimizer(pool, config, logger);
};
//# sourceMappingURL=query-optimizer.js.map