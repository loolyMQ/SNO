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
export declare class EmailNotificationProcessor extends BaseJobProcessor<EmailNotificationPayload, EmailNotificationResult> {
    getType(): string;
    validate(payload: EmailNotificationPayload): boolean;
    process(job: {
        payload: EmailNotificationPayload;
    }): Promise<EmailNotificationResult>;
}
//# sourceMappingURL=email.d.ts.map