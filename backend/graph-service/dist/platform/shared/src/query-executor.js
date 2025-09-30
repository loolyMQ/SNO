import { QueryCache } from './query-cache';
import { QueryMetrics } from './query-metrics';
export class QueryExecutor {
    pool;
    config;
    logger;
    cache;
    metrics;
    constructor(pool, config, logger) {
        this.pool = pool;
        this.config = config;
        this.logger = logger;
        this.cache = new QueryCache({
            maxSize: 1000,
            ttl: 300000,
            enableCompression: false,
        });
        this.metrics = new QueryMetrics({
            slowQueryThreshold: config.slowQueryThreshold,
            verySlowQueryThreshold: config.verySlowQueryThreshold,
            enableMetrics: config.enableMetrics,
        });
    }
    async executeOptimized(query, params = [], options = {}) {
        const startTime = Date.now();
        const queryType = this.metrics.extractQueryType(query);
        const table = this.metrics.extractTableName(query);
        try {
            const cacheKey = this.cache.generateKey(query, params);
            let analysis;
            if (this.config.enableCaching && !options.forceAnalyze) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    this.logger.debug('Query cache hit', { query: query.substring(0, 100) });
                    return { result: await this.executeQuery(query, params), analysis: cached };
                }
            }
            analysis = await this.analyzeQuery(query, params);
            if (this.config.enableCaching && options.cacheResults !== false) {
                this.cache.set(cacheKey, analysis);
            }
            let finalQuery = query;
            if (options.enableOptimization && analysis.optimizationLevel === 'poor') {
                const optimization = await this.optimizeQuery(query);
                if (optimization.improvementFactor > 1.2) {
                    finalQuery = optimization.optimizedQuery;
                    this.logger.info(`Query optimized with ${optimization.improvementFactor}x improvement`);
                }
            }
            const result = await this.executeQuery(finalQuery, params);
            const executionTime = Date.now() - startTime;
            this.metrics.recordQuery(queryType, table, executionTime, analysis);
            if (executionTime > this.config.slowQueryThreshold) {
                this.logger.warn('Slow query detected', {
                    query: query.substring(0, 200),
                    executionTime,
                    optimizationLevel: analysis.optimizationLevel,
                    recommendations: analysis.recommendations,
                });
            }
            return { result, analysis };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.metrics.recordError(queryType, table, error);
            this.logger.error('Query execution failed', {
                query: query.substring(0, 200),
                executionTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async executeQuery(query, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(query, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async analyzeQuery(query, params = []) {
        const startTime = Date.now();
        try {
            const client = await this.pool.connect();
            let plan;
            let rowsReturned = 0;
            try {
                if (this.shouldUseExplainAnalyze(query)) {
                    const explainResult = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`, params);
                    const planData = explainResult.rows[0]['QUERY PLAN'][0];
                    plan = {
                        planRows: planData['Plan']['Plan Rows'] || 0,
                        planCost: planData['Plan']['Total Cost'] || 0,
                        actualRows: planData['Plan']['Actual Rows'] || 0,
                        actualTime: planData['Plan']['Actual Total Time'] || 0,
                        indexScans: this.extractIndexScans(planData),
                        seqScans: this.extractSeqScans(planData),
                        joins: this.extractJoins(planData),
                        sorts: this.extractSorts(planData),
                    };
                    rowsReturned = plan.actualRows || 0;
                }
                else {
                    const result = await client.query(query, params);
                    rowsReturned = result.rows.length;
                    plan = {
                        planRows: rowsReturned,
                        planCost: 0,
                        actualRows: rowsReturned,
                        actualTime: Date.now() - startTime,
                    };
                }
            }
            finally {
                client.release();
            }
            const executionTime = Date.now() - startTime;
            const indexesUsed = plan.indexScans || [];
            const recommendations = this.generateRecommendations(plan, executionTime);
            const optimizationLevel = this.calculateOptimizationLevel(plan, executionTime);
            return {
                query,
                executionTime,
                planCost: plan.planCost,
                rowsReturned,
                indexesUsed,
                recommendations,
                optimizationLevel,
            };
        }
        catch (error) {
            this.logger.error('Query analysis failed:', { query, error });
            throw error;
        }
    }
    async optimizeQuery(query) {
        const optimizations = [];
        let optimizedQuery = query;
        let improvementFactor = 1.0;
        if (query.toUpperCase().includes('SELECT *')) {
            optimizedQuery = query.replace(/SELECT \*/gi, 'SELECT specific_columns');
            optimizations.push('Replaced SELECT * with specific columns');
            improvementFactor *= 1.2;
        }
        if (query.toUpperCase().includes('ORDER BY') && !query.toUpperCase().includes('LIMIT')) {
            optimizations.push('Consider adding LIMIT clause to ORDER BY queries');
        }
        if (query.toUpperCase().includes('WHERE') && query.toUpperCase().includes('LIKE')) {
            optimizations.push('Consider using full-text search instead of LIKE for better performance');
        }
        return {
            originalQuery: query,
            optimizedQuery,
            improvementFactor,
            optimizations,
        };
    }
    shouldUseExplainAnalyze(query) {
        const upperQuery = query.toUpperCase().trim();
        return upperQuery.startsWith('SELECT') && !upperQuery.includes('LIMIT 0');
    }
    extractIndexScans(planData) {
        const indexScans = [];
        this.traversePlan(planData['Plan'], (node) => {
            if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Index Only Scan') {
                const indexName = node['Index Name'];
                if (indexName) {
                    indexScans.push(indexName);
                }
            }
        });
        return indexScans;
    }
    extractSeqScans(planData) {
        const seqScans = [];
        this.traversePlan(planData['Plan'], (node) => {
            if (node['Node Type'] === 'Seq Scan') {
                const relationName = node['Relation Name'];
                if (relationName) {
                    seqScans.push(relationName);
                }
            }
        });
        return seqScans;
    }
    extractJoins(planData) {
        const joins = [];
        this.traversePlan(planData['Plan'], (node) => {
            if (node['Node Type'] && node['Node Type'].includes('Join')) {
                joins.push(node['Node Type']);
            }
        });
        return joins;
    }
    extractSorts(planData) {
        const sorts = [];
        this.traversePlan(planData['Plan'], (node) => {
            if (node['Node Type'] === 'Sort') {
                sorts.push('Sort');
            }
        });
        return sorts;
    }
    traversePlan(plan, callback) {
        if (!plan)
            return;
        callback(plan);
        if (plan['Plans'] && Array.isArray(plan['Plans'])) {
            plan['Plans'].forEach((subPlan) => this.traversePlan(subPlan, callback));
        }
    }
    generateRecommendations(plan, executionTime) {
        const recommendations = [];
        if (plan.seqScans && plan.seqScans.length > 0) {
            recommendations.push(`Consider adding indexes for tables: ${plan.seqScans.join(', ')}`);
        }
        if (plan.planCost > 1000) {
            recommendations.push('Query has high cost - consider optimization');
        }
        if (executionTime > 1000) {
            recommendations.push('Query execution time is high - consider adding indexes or rewriting');
        }
        if (plan.sorts && plan.sorts.length > 0) {
            recommendations.push('Query uses sorting - consider adding indexes for ORDER BY columns');
        }
        if (plan.joins && plan.joins.length > 0) {
            recommendations.push('Query uses joins - ensure proper indexes on join columns');
        }
        return recommendations;
    }
    calculateOptimizationLevel(plan, executionTime) {
        if (executionTime < 100 && plan.planCost < 100)
            return 'excellent';
        if (executionTime < 500 && plan.planCost < 500)
            return 'good';
        if (executionTime < 2000 && plan.planCost < 2000)
            return 'poor';
        return 'critical';
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    getMetrics() {
        return this.metrics.getMetrics();
    }
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=query-executor.js.map