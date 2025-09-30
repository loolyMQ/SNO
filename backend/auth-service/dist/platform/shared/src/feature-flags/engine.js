import { FeatureFlagStatus, FeatureFlagType, } from './types';
export class FeatureFlagEngine {
    flags = new Map();
    cache = new Map();
    cacheExpiry = new Map();
    CACHE_TTL = 60000;
    addFlag(flag) {
        this.flags.set(flag.key, flag);
        this.invalidateCache(flag.key);
    }
    updateFlag(key, updates) {
        const existing = this.flags.get(key);
        if (!existing) {
            throw new Error(`Feature flag ${key} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
        };
        this.flags.set(key, updated);
        this.invalidateCache(key);
    }
    removeFlag(key) {
        this.flags.delete(key);
        this.invalidateCache(key);
    }
    evaluate(key, context) {
        const cacheKey = this.getCacheKey(key, context);
        const cached = this.getCachedEvaluation(cacheKey);
        if (cached) {
            return cached;
        }
        const flag = this.flags.get(key);
        if (!flag) {
            return {
                key,
                value: null,
                reason: 'Flag not found',
                timestamp: Date.now(),
            };
        }
        const evaluation = this.evaluateFlag(flag, context);
        this.setCachedEvaluation(cacheKey, evaluation);
        return evaluation;
    }
    evaluateFlag(flag, context) {
        if (flag.status === FeatureFlagStatus.DISABLED) {
            return {
                key: flag.key,
                value: flag.defaultValue,
                reason: 'Flag disabled',
                timestamp: Date.now(),
            };
        }
        if (flag.status === FeatureFlagStatus.ENABLED) {
            return {
                key: flag.key,
                value: this.getFlagValue(flag),
                reason: 'Flag enabled',
                timestamp: Date.now(),
            };
        }
        if (flag.status === FeatureFlagStatus.ROLLOUT) {
            if (this.shouldIncludeInRollout(flag, context)) {
                return {
                    key: flag.key,
                    value: this.getFlagValue(flag),
                    reason: 'Included in rollout',
                    timestamp: Date.now(),
                };
            }
            else {
                return {
                    key: flag.key,
                    value: flag.defaultValue,
                    reason: 'Excluded from rollout',
                    timestamp: Date.now(),
                };
            }
        }
        return {
            key: flag.key,
            value: flag.defaultValue,
            reason: 'Unknown status',
            timestamp: Date.now(),
        };
    }
    shouldIncludeInRollout(flag, context) {
        if (flag.targetUsers && context.userId && flag.targetUsers.includes(context.userId)) {
            return true;
        }
        if (flag.targetGroups && context.userGroups) {
            const hasMatchingGroup = flag.targetGroups.some(group => context.userGroups.includes(group));
            if (hasMatchingGroup) {
                return true;
            }
        }
        if (flag.conditions && !this.evaluateConditions(flag.conditions, context)) {
            return false;
        }
        if (flag.rolloutPercentage !== undefined) {
            const hash = this.hashString(`${flag.key}:${context.userId || context.sessionId || 'anonymous'}`);
            return hash % 100 < flag.rolloutPercentage;
        }
        return false;
    }
    evaluateConditions(conditions, context) {
        return conditions.every(condition => {
            const contextValue = this.getContextValue(condition.field, context);
            return this.evaluateCondition(condition, contextValue);
        });
    }
    getContextValue(field, context) {
        const parts = field.split('.');
        let value = context;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    evaluateCondition(condition, contextValue) {
        const { operator, value } = condition;
        switch (operator) {
            case 'equals':
                return contextValue === value;
            case 'not_equals':
                return contextValue !== value;
            case 'contains':
                return typeof contextValue === 'string' && contextValue.includes(String(value));
            case 'not_contains':
                return typeof contextValue === 'string' && !contextValue.includes(String(value));
            case 'starts_with':
                return typeof contextValue === 'string' && contextValue.startsWith(String(value));
            case 'ends_with':
                return typeof contextValue === 'string' && contextValue.endsWith(String(value));
            case 'regex':
                return typeof contextValue === 'string' && new RegExp(String(value)).test(contextValue);
            default:
                return false;
        }
    }
    getFlagValue(flag) {
        switch (flag.type) {
            case FeatureFlagType.BOOLEAN:
                return true;
            case FeatureFlagType.STRING:
                return flag.defaultValue;
            case FeatureFlagType.NUMBER:
                return Number(flag.defaultValue);
            case FeatureFlagType.JSON:
                return typeof flag.defaultValue === 'string'
                    ? JSON.parse(flag.defaultValue)
                    : flag.defaultValue;
            default:
                return flag.defaultValue;
        }
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    getCacheKey(key, context) {
        return `${key}:${context.userId || 'anonymous'}:${context.sessionId || 'no-session'}`;
    }
    getCachedEvaluation(cacheKey) {
        const expiry = this.cacheExpiry.get(cacheKey);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(cacheKey);
            this.cacheExpiry.delete(cacheKey);
            return null;
        }
        return this.cache.get(cacheKey) || null;
    }
    setCachedEvaluation(cacheKey, evaluation) {
        this.cache.set(cacheKey, evaluation);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
    }
    invalidateCache(key) {
        for (const [cacheKey] of this.cache) {
            if (cacheKey.startsWith(`${key}:`)) {
                this.cache.delete(cacheKey);
                this.cacheExpiry.delete(cacheKey);
            }
        }
    }
    getAllFlags() {
        return Array.from(this.flags.values());
    }
    getFlag(key) {
        return this.flags.get(key);
    }
    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
    }
}
//# sourceMappingURL=engine.js.map