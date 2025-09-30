import {
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FeatureFlagStatus,
  FeatureFlagType,
} from './types';

export class FeatureFlagEngine {
  private flags: Map<string, FeatureFlag> = new Map();
  private cache: Map<string, FeatureFlagEvaluation> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000;

  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
    this.invalidateCache(flag.key);
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>): void {
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

  removeFlag(key: string): void {
    this.flags.delete(key);
    this.invalidateCache(key);
  }

  evaluate(key: string, context: FeatureFlagContext): FeatureFlagEvaluation {
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

  private evaluateFlag(flag: FeatureFlag, context: FeatureFlagContext): FeatureFlagEvaluation {
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
      } else {
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

  private shouldIncludeInRollout(flag: FeatureFlag, context: FeatureFlagContext): boolean {
    if (flag.targetUsers && context.userId && flag.targetUsers.includes(context.userId)) {
      return true;
    }

    if (flag.targetGroups && context.userGroups) {
      const hasMatchingGroup = flag.targetGroups.some(group => context.userGroups!.includes(group));
      if (hasMatchingGroup) {
        return true;
      }
    }

    if (flag.conditions && !this.evaluateConditions(flag.conditions, context)) {
      return false;
    }

    if (flag.rolloutPercentage !== undefined) {
      const hash = this.hashString(
        `${flag.key}:${context.userId || context.sessionId || 'anonymous'}`
      );
      return hash % 100 < flag.rolloutPercentage;
    }

    return false;
  }

  private evaluateConditions(
    conditions: Array<{ field: string; operator: string; value: unknown }>,
    context: FeatureFlagContext
  ): boolean {
    return conditions.every(condition => {
      const contextValue = this.getContextValue(condition.field, context);
      return this.evaluateCondition(condition, contextValue);
    });
  }

  private getContextValue(field: string, context: FeatureFlagContext): unknown {
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as any)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private evaluateCondition(
    condition: { operator: string; value: unknown },
    contextValue: unknown
  ): boolean {
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

  private getFlagValue(flag: FeatureFlag): unknown {
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

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getCacheKey(key: string, context: FeatureFlagContext): string {
    return `${key}:${context.userId || 'anonymous'}:${context.sessionId || 'no-session'}`;
  }

  private getCachedEvaluation(cacheKey: string): FeatureFlagEvaluation | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }

    return this.cache.get(cacheKey) || null;
  }

  private setCachedEvaluation(cacheKey: string, evaluation: FeatureFlagEvaluation): void {
    this.cache.set(cacheKey, evaluation);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
  }

  private invalidateCache(key: string): void {
    for (const [cacheKey] of this.cache) {
      if (cacheKey.startsWith(`${key}:`)) {
        this.cache.delete(cacheKey);
        this.cacheExpiry.delete(cacheKey);
      }
    }
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
