export class QueryCache {
    cache = new Map();
    config;
    constructor(config) {
        this.config = config;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (this.isExpired(entry.timestamp)) {
            this.cache.delete(key);
            return null;
        }
        return entry.analysis;
    }
    set(key, analysis) {
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldest();
        }
        this.cache.set(key, {
            analysis,
            timestamp: Date.now(),
        });
    }
    has(key) {
        const entry = this.cache.get(key);
        return entry ? !this.isExpired(entry.timestamp) : false;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
    getStats() {
        const entries = Array.from(this.cache.values());
        const timestamps = entries.map(entry => entry.timestamp);
        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitRate: 0,
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
        };
    }
    isExpired(timestamp) {
        return Date.now() - timestamp > this.config.ttl;
    }
    evictOldest() {
        let oldestKey = '';
        let oldestTimestamp = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestKey = key;
                oldestTimestamp = entry.timestamp;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    generateKey(query, params = []) {
        const normalizedQuery = query.trim().toLowerCase();
        const paramsString = JSON.stringify(params);
        return `${normalizedQuery}:${paramsString}`;
    }
}
//# sourceMappingURL=query-cache.js.map