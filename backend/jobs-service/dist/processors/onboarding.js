import { BaseJobProcessor } from './base';
export class UserOnboardingProcessor extends BaseJobProcessor {
    getType() { return 'user_onboarding'; }
    validate(payload) { return Boolean(payload && typeof payload.userId === 'string'); }
    async process(job) {
        if (!this.validate(job.payload))
            throw new Error('Invalid user onboarding payload');
        const steps = ['welcome_email', 'tutorial_assignment', 'profile_setup', 'sample_data_creation', 'notification_preferences'];
        await new Promise(resolve => setTimeout(resolve, 2500));
        return this.createResult({ userId: job.payload.userId, onboardingCompleted: true, completedSteps: steps, duration: 2500 });
    }
}
//# sourceMappingURL=onboarding.js.map