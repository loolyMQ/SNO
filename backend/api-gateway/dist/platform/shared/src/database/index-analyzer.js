export class IndexAnalyzer {
    queryStats = [];
    maxStatsEntries;
    logger;
    constructor(maxStatsEntries = 1000, logger) {
        this.maxStatsEntries = maxStatsEntries;
        this.logger = logger;
    }
    recordQuery(field, operation, executionTime, resultCount, indexUsed) {
        const stats = {
            field,
            operation,
            executionTime,
            resultCount,
            timestamp: Date.now(),
            indexUsed,
        };
        this.queryStats.push(stats);
        if (this.queryStats.length > this.maxStatsEntries) {
            this.queryStats.shift();
        }
    }
    analyzeIndex(indexName) {
        const indexQueries = this.queryStats.filter(stat => stat.field === indexName);
        if (indexQueries.length === 0) {
            return {
                indexName,
                usageCount: 0,
                averageExecutionTime: 0,
                hitRate: 0,
                recommendations: ['Index has no usage data'],
                efficiency: 'low',
            };
        }
        const usageCount = indexQueries.length;
        const averageExecutionTime = indexQueries.reduce((sum, stat) => sum + stat.executionTime, 0) / usageCount;
        const indexUsedCount = indexQueries.filter(stat => stat.indexUsed).length;
        const hitRate = (indexUsedCount / usageCount) * 100;
        const recommendations = this.generateRecommendations(indexQueries, hitRate, averageExecutionTime);
        const efficiency = this.calculateEfficiency(hitRate, averageExecutionTime);
        return {
            indexName,
            usageCount,
            averageExecutionTime,
            hitRate,
            recommendations,
            efficiency,
        };
    }
    analyzeAllIndexes() {
        const uniqueFields = [...new Set(this.queryStats.map(stat => stat.field))];
        return uniqueFields.map(field => this.analyzeIndex(field));
    }
    getSlowQueries(threshold = 100) {
        return this.queryStats
            .filter(stat => stat.executionTime > threshold)
            .sort((a, b) => b.executionTime - a.executionTime);
    }
    getQueryPatterns() {
        const fieldCounts = new Map();
        const operationTimes = new Map();
        for (const stat of this.queryStats) {
            fieldCounts.set(stat.field, (fieldCounts.get(stat.field) || 0) + 1);
            if (!operationTimes.has(stat.operation)) {
                operationTimes.set(stat.operation, []);
            }
            operationTimes.get(stat.operation).push(stat.executionTime);
        }
        const mostUsedFields = Array.from(fieldCounts.entries())
            .map(([field, count]) => ({ field, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const slowestOperations = Array.from(operationTimes.entries())
            .map(([operation, times]) => ({
            operation,
            avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, 10);
        const totalQueries = this.queryStats.length;
        const indexedQueries = this.queryStats.filter(stat => stat.indexUsed).length;
        const indexUtilization = totalQueries > 0 ? (indexedQueries / totalQueries) * 100 : 0;
        return {
            mostUsedFields,
            slowestOperations,
            indexUtilization,
        };
    }
    suggestIndexes(existingIndexes) {
        const suggestions = [];
        const patterns = this.getQueryPatterns();
        for (const field of patterns.mostUsedFields) {
            if (!existingIndexes.includes(field.field)) {
                suggestions.push(`CREATE INDEX idx_${field.field} ON table_name (${field.field})`);
            }
        }
        const slowQueries = this.getSlowQueries(50);
        const slowFields = new Set(slowQueries.map(q => q.field));
        for (const field of slowFields) {
            if (!existingIndexes.includes(field)) {
                suggestions.push(`CREATE INDEX idx_${field}_performance ON table_name (${field})`);
            }
        }
        return suggestions;
    }
    getPerformanceReport() {
        const analysis = this.analyzeAllIndexes();
        const patterns = this.getQueryPatterns();
        const slowQueries = this.getSlowQueries();
        let report = '# Database Index Performance Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;
        report += '## Index Analysis\n\n';
        for (const index of analysis) {
            report += `### ${index.indexName}\n`;
            report += `- Usage Count: ${index.usageCount}\n`;
            report += `- Average Execution Time: ${index.averageExecutionTime.toFixed(2)}ms\n`;
            report += `- Hit Rate: ${index.hitRate.toFixed(2)}%\n`;
            report += `- Efficiency: ${index.efficiency}\n`;
            report += `- Recommendations:\n`;
            for (const rec of index.recommendations) {
                report += `  - ${rec}\n`;
            }
            report += '\n';
        }
        report += '## Query Patterns\n\n';
        report += `- Index Utilization: ${patterns.indexUtilization.toFixed(2)}%\n`;
        report += `- Most Used Fields: ${patterns.mostUsedFields
            .slice(0, 5)
            .map(f => f.field)
            .join(', ')}\n`;
        report += `- Slowest Operations: ${patterns.slowestOperations
            .slice(0, 3)
            .map(o => o.operation)
            .join(', ')}\n\n`;
        report += '## Slow Queries\n\n';
        if (slowQueries.length > 0) {
            for (const query of slowQueries.slice(0, 10)) {
                report += `- **${query.executionTime}ms**: ${query.field} (${query.operation})\n`;
            }
        }
        else {
            report += 'No slow queries detected.\n';
        }
        return report;
    }
    generateRecommendations(queries, hitRate, avgTime) {
        const recommendations = [];
        if (hitRate < 50) {
            recommendations.push('Low index utilization - consider reviewing query patterns');
        }
        if (avgTime > 100) {
            recommendations.push('High average execution time - consider index optimization');
        }
        const uniqueOperations = new Set(queries.map(q => q.operation));
        if (uniqueOperations.size > 5) {
            recommendations.push('Multiple operation types - consider specialized indexes');
        }
        const recentQueries = queries.filter(q => Date.now() - q.timestamp < 3600000);
        if (recentQueries.length === 0) {
            recommendations.push('No recent usage - consider removing unused index');
        }
        return recommendations;
    }
    calculateEfficiency(hitRate, avgTime) {
        if (hitRate >= 80 && avgTime <= 50)
            return 'high';
        if (hitRate >= 60 && avgTime <= 100)
            return 'medium';
        return 'low';
    }
    clearStats() {
        this.queryStats = [];
        this.logger.info('Query statistics cleared');
    }
    getStatsCount() {
        return this.queryStats.length;
    }
}
//# sourceMappingURL=index-analyzer.js.map