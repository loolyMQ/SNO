import { FeatureFlag, FeatureFlagContext, FeatureFlagEvaluation } from './types';
export declare class FeatureFlagEngine {
    private flags;
    private cache;
    private cacheExpiry;
    private readonly CACHE_TTL;
    addFlag(flag: FeatureFlag): void;
    updateFlag(key: string, updates: Partial<FeatureFlag>): void;
    removeFlag(key: string): void;
    evaluate(key: string, context: FeatureFlagContext): FeatureFlagEvaluation;
    private evaluateFlag;
    private shouldIncludeInRollout;
    private evaluateConditions;
    private getContextValue;
    private evaluateCondition;
    private getFlagValue;
    private hashString;
    private getCacheKey;
    private getCachedEvaluation;
    private setCachedEvaluation;
    private invalidateCache;
    getAllFlags(): FeatureFlag[];
    getFlag(key: string): FeatureFlag | undefined;
    clearCache(): void;
}
//# sourceMappingURL=engine.d.ts.map