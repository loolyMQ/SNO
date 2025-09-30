import { IJobProcessor } from './base';
export declare class JobProcessorFactory {
    private processors;
    constructor();
    registerProcessor(type: string, factory: () => IJobProcessor): void;
    createProcessor(type: string): IJobProcessor;
    getSupportedTypes(): string[];
    isTypeSupported(type: string): boolean;
}
//# sourceMappingURL=job-processor-factory.d.ts.map