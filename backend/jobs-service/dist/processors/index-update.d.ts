import { BaseJobProcessor } from './base';
export interface IndexUpdatePayload {
    type: 'users' | 'publications' | 'institutions' | 'graphs';
    count: number;
    data?: unknown[];
}
export interface IndexUpdateResult {
    indexUpdated: boolean;
    indexType: string;
    documentsProcessed: number;
    documentsSkipped: number;
}
export declare class IndexUpdateProcessor extends BaseJobProcessor<IndexUpdatePayload, IndexUpdateResult> {
    getType(): string;
    validate(payload: IndexUpdatePayload): boolean;
    process(job: {
        payload: IndexUpdatePayload;
    }): Promise<IndexUpdateResult>;
}
//# sourceMappingURL=index-update.d.ts.map