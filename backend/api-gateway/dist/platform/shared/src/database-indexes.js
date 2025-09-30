import pino from 'pino';
import { IndexManager } from './database/index-manager';
import { IndexAnalyzer } from './database/index-analyzer';
import { IndexMetrics } from './database/index-metrics';
export class DatabaseIndexManager {
    manager;
    analyzer;
    metrics;
    logger;
    constructor(serviceName) {
        this.logger = pino({
            level: process.env['LOG_LEVEL'] || 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        });
        this.manager = new IndexManager(serviceName, this.logger);
        this.analyzer = new IndexAnalyzer(1000, this.logger);
        this.metrics = new IndexMetrics(serviceName, this.logger);
    }
    createIndex(name, config) {
        this.manager.createIndex(name, config);
        this.metrics.recordIndexSize(name, 0);
    }
    addToIndexes(document) {
        this.manager.addToIndexes(document);
        for (const indexName of this.manager.getAllIndexes()) {
            const size = this.manager.getIndexSize(indexName);
            this.metrics.recordIndexSize(indexName, size);
        }
    }
    removeFromIndexes(document) {
        this.manager.removeFromIndexes(document);
        for (const indexName of this.manager.getAllIndexes()) {
            const size = this.manager.getIndexSize(indexName);
            this.metrics.recordIndexSize(indexName, size);
        }
    }
    findByIndex(indexName, value) {
        const startTime = Date.now();
        try {
            const results = this.manager.findByIndex(indexName, value);
            const executionTime = Date.now() - startTime;
            this.analyzer.recordQuery(indexName, 'find', executionTime, results.length, true);
            this.metrics.recordIndexUsage(indexName, 'find', 'success');
            this.metrics.recordIndexExecutionTime(indexName, 'find', executionTime);
            return results;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.analyzer.recordQuery(indexName, 'find', executionTime, 0, false);
            this.metrics.recordIndexUsage(indexName, 'find', 'error');
            this.logger.error(`Index query failed for ${indexName}:`, error);
            throw error;
        }
    }
    findByCompoundIndex(indexName, values) {
        const startTime = Date.now();
        try {
            const results = this.manager.findByCompoundIndex(indexName, values);
            const executionTime = Date.now() - startTime;
            this.analyzer.recordQuery(indexName, 'compound_find', executionTime, results.length, true);
            this.metrics.recordIndexUsage(indexName, 'compound_find', 'success');
            this.metrics.recordIndexExecutionTime(indexName, 'compound_find', executionTime);
            return results;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.analyzer.recordQuery(indexName, 'compound_find', executionTime, 0, false);
            this.metrics.recordIndexUsage(indexName, 'compound_find', 'error');
            this.logger.error(`Compound index query failed for ${indexName}:`, error);
            throw error;
        }
    }
    analyzeIndex(indexName) {
        return this.analyzer.analyzeIndex(indexName);
    }
    analyzeAllIndexes() {
        return this.analyzer.analyzeAllIndexes();
    }
    getSlowQueries(threshold = 100) {
        return this.analyzer.getSlowQueries(threshold);
    }
    getQueryPatterns() {
        return this.analyzer.getQueryPatterns();
    }
    suggestIndexes() {
        const existingIndexes = this.manager.getAllIndexes();
        return this.analyzer.suggestIndexes(existingIndexes);
    }
    getPerformanceReport() {
        const analyzerReport = this.analyzer.getPerformanceReport();
        const metricsReport = this.metrics.getIndexPerformanceReport();
        return `${analyzerReport}\n\n${metricsReport}`;
    }
    getMetrics() {
        return this.metrics.getPrometheusMetrics();
    }
    getIndexUsageStats() {
        return this.metrics.getIndexUsageStats();
    }
    getAllIndexes() {
        return this.manager.getAllIndexes();
    }
    getIndexConfig(indexName) {
        return this.manager.getIndexConfig(indexName);
    }
    dropIndex(indexName) {
        const result = this.manager.dropIndex(indexName);
        if (result) {
            this.metrics.recordIndexSize(indexName, 0);
        }
        return result;
    }
    clearIndex(indexName) {
        const result = this.manager.clearIndex(indexName);
        if (result) {
            this.metrics.recordIndexSize(indexName, 0);
        }
        return result;
    }
    getIndexSize(indexName) {
        return this.manager.getIndexSize(indexName);
    }
    clearStats() {
        this.analyzer.clearStats();
        this.metrics.resetMetrics();
    }
    getStatsCount() {
        return this.analyzer.getStatsCount();
    }
}
//# sourceMappingURL=database-indexes.js.map