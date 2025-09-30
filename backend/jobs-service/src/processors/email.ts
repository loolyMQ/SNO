import { BaseJobProcessor } from './base';

export interface EmailNotificationPayload {
  email: string;
  subject: string;
  body: string;
  template?: string;
}

export interface EmailNotificationResult {
  emailSent: boolean;
  recipient: string;
  subject: string;
}

export class EmailNotificationProcessor extends BaseJobProcessor<EmailNotificationPayload, EmailNotificationResult> {
  getType(): string {
    return 'email_notification';
  }

  validate(payload: EmailNotificationPayload): boolean {
    return Boolean(payload && typeof payload.email === 'string' && payload.email.includes('@') && typeof payload.subject === 'string' && typeof payload.body === 'string');
  }

  async process(job: { payload: EmailNotificationPayload }): Promise<EmailNotificationResult> {
    if (!this.validate(job.payload)) throw new Error('Invalid email notification payload');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.createResult({ emailSent: true, recipient: job.payload.email, subject: job.payload.subject });
  }
}


