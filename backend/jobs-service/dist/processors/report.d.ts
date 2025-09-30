import { BaseJobProcessor } from './base';
export interface ReportGenerationPayload {
    reportType: 'analytics' | 'usage' | 'research' | 'financial';
    period: string;
    dateRange?: {
        start: string;
        end: string;
    };
}
export interface ReportGenerationResult {
    reportUrl: string;
    reportType: string;
    period: string;
    pageCount: number;
    dataPoints: number;
}
export declare class ReportGenerationProcessor extends BaseJobProcessor<ReportGenerationPayload, ReportGenerationResult> {
    getType(): string;
    validate(payload: ReportGenerationPayload): boolean;
    process(job: {
        payload: ReportGenerationPayload;
    }): Promise<ReportGenerationResult>;
}
//# sourceMappingURL=report.d.ts.map