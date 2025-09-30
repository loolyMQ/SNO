import { BaseJobProcessor } from './base';
export interface CleanupPayload {
    target: 'logs' | 'cache' | 'temp_files' | 'old_exports';
    olderThanDays?: number;
}
export interface CleanupResult {
    target: string;
    cleanedItems: number;
    freedSpace: number;
    duration: number;
}
export declare class CleanupProcessor extends BaseJobProcessor<CleanupPayload, CleanupResult> {
    getType(): string;
    validate(payload: CleanupPayload): boolean;
    process(job: {
        payload: CleanupPayload;
    }): Promise<CleanupResult>;
}
//# sourceMappingURL=cleanup.d.ts.map