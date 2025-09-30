import { BaseJobProcessor } from './base';
export interface DataExportPayload {
    format: 'csv' | 'json' | 'xlsx' | 'pdf';
    data: unknown[];
    dataType?: string;
}
export interface DataExportResult {
    exportUrl: string;
    format: string;
    size: number;
    recordCount: number;
}
export declare class DataExportProcessor extends BaseJobProcessor<DataExportPayload, DataExportResult> {
    getType(): string;
    validate(payload: DataExportPayload): boolean;
    process(job: {
        payload: DataExportPayload;
    }): Promise<DataExportResult>;
}
//# sourceMappingURL=data-export.d.ts.map