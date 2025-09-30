import { BaseJobProcessor } from './base';

export interface UserOnboardingPayload { userId: string; userEmail?: string; preferences?: Record<string, unknown> }
export interface UserOnboardingResult { userId: string; onboardingCompleted: boolean; completedSteps: string[]; duration: number }

export class UserOnboardingProcessor extends BaseJobProcessor<UserOnboardingPayload, UserOnboardingResult> {
  getType(): string { return 'user_onboarding'; }
  validate(payload: UserOnboardingPayload): boolean { return Boolean(payload && typeof payload.userId === 'string'); }
  async process(job: { payload: UserOnboardingPayload }): Promise<UserOnboardingResult> {
    if (!this.validate(job.payload)) throw new Error('Invalid user onboarding payload');
    const steps = ['welcome_email','tutorial_assignment','profile_setup','sample_data_creation','notification_preferences'];
    await new Promise(resolve => setTimeout(resolve, 2500));
    return this.createResult({ userId: job.payload.userId, onboardingCompleted: true, completedSteps: steps, duration: 2500 });
  }
}


