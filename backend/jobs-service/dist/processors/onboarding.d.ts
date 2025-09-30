import { BaseJobProcessor } from './base';
export interface UserOnboardingPayload {
    userId: string;
    userEmail?: string;
    preferences?: Record<string, unknown>;
}
export interface UserOnboardingResult {
    userId: string;
    onboardingCompleted: boolean;
    completedSteps: string[];
    duration: number;
}
export declare class UserOnboardingProcessor extends BaseJobProcessor<UserOnboardingPayload, UserOnboardingResult> {
    getType(): string;
    validate(payload: UserOnboardingPayload): boolean;
    process(job: {
        payload: UserOnboardingPayload;
    }): Promise<UserOnboardingResult>;
}
//# sourceMappingURL=onboarding.d.ts.map