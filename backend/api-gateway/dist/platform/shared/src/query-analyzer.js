export class QueryAnalyzer {
    pool;
    logger;
    constructor(pool, logger) {
        this.pool = pool;
        this.logger = logger;
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
}
//# sourceMappingURL=query-analyzer.js.map