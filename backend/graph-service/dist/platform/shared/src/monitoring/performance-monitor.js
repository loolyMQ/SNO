import { ResourceMonitor } from './resource-monitor';
import { Gauge, Counter, Histogram } from 'prom-client';
export class PerformanceMonitor {
    resourceMonitor;
    throughputGauge;
    latencyHistogram;
    errorRateGauge;
    queueSizeGauge;
    cacheHitRateGauge;
    databaseQueryCounter;
    databaseQueryHistogram;
    requestTimes = [];
    errorCounts = {};
    lastUpdateTime = Date.now();
    requestCount = 0;
    errorCount = 0;
    constructor(serviceName) {
        this.resourceMonitor = new ResourceMonitor(serviceName);
        this.throughputGauge = new Gauge({
            name: `${serviceName}_throughput_rps`,
            help: 'Requests per second',
            labelNames: ['type'],
        });
        this.latencyHistogram = new Histogram({
            name: `${serviceName}_latency_seconds`,
            help: 'Request latency in seconds',
            labelNames: ['operation'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
        });
        this.errorRateGauge = new Gauge({
            name: `${serviceName}_error_rate`,
            help: 'Error rate percentage',
            labelNames: ['type'],
        });
        this.queueSizeGauge = new Gauge({
            name: `${serviceName}_queue_size`,
            help: 'Queue size',
            labelNames: ['queue'],
        });
        this.cacheHitRateGauge = new Gauge({
            name: `${serviceName}_cache_hit_rate`,
            help: 'Cache hit rate percentage',
            labelNames: ['cache'],
        });
        this.databaseQueryCounter = new Counter({
            name: `${serviceName}_database_queries_total`,
            help: 'Total database queries',
            labelNames: ['operation', 'table', 'status'],
        });
        this.databaseQueryHistogram = new Histogram({
            name: `${serviceName}_database_query_duration_seconds`,
            help: 'Database query duration in seconds',
            labelNames: ['operation', 'table'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
        });
        this.startPerformanceTracking();
    }
    startPerformanceTracking() {
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 10000);
    }
    updatePerformanceMetrics() {
        const now = Date.now();
        const timeDiff = (now - this.lastUpdateTime) / 1000;
        if (timeDiff > 0) {
            const rps = this.requestCount / timeDiff;
            const eps = this.errorCount / timeDiff;
            const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
            this.throughputGauge.labels({ type: 'requests' }).set(rps);
            this.throughputGauge.labels({ type: 'errors' }).set(eps);
            this.errorRateGauge.labels({ type: 'overall' }).set(errorRate);
            Object.entries(this.errorCounts).forEach(([type, count]) => {
                const typeErrorRate = this.requestCount > 0 ? (count / this.requestCount) * 100 : 0;
                this.errorRateGauge.labels({ type }).set(typeErrorRate);
            });
        }
        this.requestCount = 0;
        this.errorCount = 0;
        this.errorCounts = {};
        this.lastUpdateTime = now;
    }
    recordRequest(duration, operation = 'request') {
        this.requestCount++;
        this.requestTimes.push(duration);
        if (this.requestTimes.length > 1000) {
            this.requestTimes = this.requestTimes.slice(-1000);
        }
        this.latencyHistogram.labels({ operation }).observe(duration);
    }
    recordError(type, severity = 'medium') {
        this.errorCount++;
        this.errorCounts[type] = (this.errorCounts[type] || 0) + 1;
        this.resourceMonitor.recordError(type, severity);
    }
    recordDatabaseQuery(operation, table, duration, status) {
        this.databaseQueryCounter.labels({ operation, table, status }).inc();
        this.databaseQueryHistogram.labels({ operation, table }).observe(duration);
    }
    setQueueSize(queueName, size) {
        this.queueSizeGauge.labels({ queue: queueName }).set(size);
    }
    setCacheHitRate(cacheName, hitRate) {
        this.cacheHitRateGauge.labels({ cache: cacheName }).set(hitRate);
    }
    setActiveConnections(count) {
        this.resourceMonitor.setActiveConnections(count);
    }
    getPerformanceMetrics() {
        const resources = this.resourceMonitor.getCurrentMetrics();
        const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
        const p50 = this.calculatePercentile(sortedTimes, 50);
        const p95 = this.calculatePercentile(sortedTimes, 95);
        const p99 = this.calculatePercentile(sortedTimes, 99);
        const max = sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0;
        const now = Date.now();
        const timeDiff = (now - this.lastUpdateTime) / 1000;
        const rps = timeDiff > 0 ? this.requestCount / timeDiff : 0;
        const eps = timeDiff > 0 ? this.errorCount / timeDiff : 0;
        const avgResponseTime = sortedTimes.length > 0
            ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
            : 0;
        return {
            throughput: {
                requestsPerSecond: rps,
                errorsPerSecond: eps,
                averageResponseTime: avgResponseTime,
            },
            latency: {
                p50,
                p95,
                p99,
                max: max || 0,
            },
            errors: {
                rate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
                types: { ...this.errorCounts },
            },
            resources,
        };
    }
    calculatePercentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)] || 0;
    }
    async getMetrics() {
        return await this.resourceMonitor.getMetrics();
    }
    clearMetrics() {
        this.resourceMonitor.clearMetrics();
        this.requestTimes = [];
        this.errorCounts = {};
        this.requestCount = 0;
        this.errorCount = 0;
    }
}
//# sourceMappingURL=performance-monitor.js.map