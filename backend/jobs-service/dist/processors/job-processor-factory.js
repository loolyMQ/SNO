import { EmailNotificationProcessor } from './email';
import { DataExportProcessor } from './data-export';
import { IndexUpdateProcessor } from './index-update';
import { ReportGenerationProcessor } from './report';
import { CleanupProcessor } from './cleanup';
import { UserOnboardingProcessor } from './onboarding';
export class JobProcessorFactory {
    processors = new Map();
    constructor() {
        this.registerProcessor('email_notification', () => new EmailNotificationProcessor());
        this.registerProcessor('data_export', () => new DataExportProcessor());
        this.registerProcessor('index_update', () => new IndexUpdateProcessor());
        this.registerProcessor('report_generation', () => new ReportGenerationProcessor());
        this.registerProcessor('cleanup', () => new CleanupProcessor());
        this.registerProcessor('user_onboarding', () => new UserOnboardingProcessor());
    }
    registerProcessor(type, factory) {
        this.processors.set(type, factory);
    }
    createProcessor(type) {
        const factory = this.processors.get(type);
        if (!factory) {
            throw new Error(`No processor registered for job type: ${type}`);
        }
        return factory();
    }
    getSupportedTypes() {
        return Array.from(this.processors.keys());
    }
    isTypeSupported(type) {
        return this.processors.has(type);
    }
}
//# sourceMappingURL=job-processor-factory.js.map