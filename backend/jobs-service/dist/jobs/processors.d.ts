import pino from 'pino';
import { Job } from './types';
export declare function createJobProcessors(logger: pino.Logger): {
    readonly email_notification: (job: Job) => Promise<{
        emailSent: boolean;
        recipient: unknown;
    }>;
    readonly data_export: (job: Job) => Promise<{
        exportUrl: string;
    }>;
    readonly index_update: (job: Job) => Promise<{
        indexUpdated: boolean;
        documentsProcessed: number;
    }>;
    readonly report_generation: (job: Job) => Promise<{
        reportUrl: string;
    }>;
    readonly cleanup: (job: Job) => Promise<{
        cleanedItems: number;
    }>;
    readonly user_onboarding: (job: Job) => Promise<{
        onboardingCompleted: boolean;
        steps: string[];
    }>;
};
//# sourceMappingURL=processors.d.ts.map