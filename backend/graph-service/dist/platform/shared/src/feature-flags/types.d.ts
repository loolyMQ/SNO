export declare enum FeatureFlagType {
    BOOLEAN = "boolean",
    STRING = "string",
    NUMBER = "number",
    JSON = "json"
}
export declare enum FeatureFlagStatus {
    ENABLED = "enabled",
    DISABLED = "disabled",
    ROLLOUT = "rollout"
}
export interface FeatureFlag {
    key: string;
    name: string;
    description: string;
    type: FeatureFlagType;
    status: FeatureFlagStatus;
    defaultValue: unknown;
    rolloutPercentage?: number;
    targetUsers?: string[];
    targetGroups?: string[];
    conditions?: FeatureFlagCondition[];
    createdAt: number;
    updatedAt: number;
    createdBy: string;
}
export interface FeatureFlagCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex';
    value: string | number | boolean;
}
export interface FeatureFlagEvaluation {
    key: string;
    value: unknown;
    reason: string;
    timestamp: number;
}
export interface FeatureFlagContext {
    userId?: string;
    userGroups?: string[];
    sessionId?: string;
    environment?: string;
    customAttributes?: Record<string, string | number | boolean>;
}
//# sourceMappingURL=types.d.ts.map