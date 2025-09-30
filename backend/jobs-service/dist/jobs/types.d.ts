export interface Job {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    priority: number;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    retries: number;
    maxRetries: number;
    error?: string;
    result?: unknown;
}
export declare const JobTypes: {
    readonly EMAIL_NOTIFICATION: "email_notification";
    readonly DATA_EXPORT: "data_export";
    readonly INDEX_UPDATE: "index_update";
    readonly REPORT_GENERATION: "report_generation";
    readonly CLEANUP: "cleanup";
    readonly USER_ONBOARDING: "user_onboarding";
};
//# sourceMappingURL=types.d.ts.map