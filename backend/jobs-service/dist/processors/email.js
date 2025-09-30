import { BaseJobProcessor } from './base';
export class EmailNotificationProcessor extends BaseJobProcessor {
    getType() {
        return 'email_notification';
    }
    validate(payload) {
        return Boolean(payload && typeof payload.email === 'string' && payload.email.includes('@') && typeof payload.subject === 'string' && typeof payload.body === 'string');
    }
    async process(job) {
        if (!this.validate(job.payload))
            throw new Error('Invalid email notification payload');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.createResult({ emailSent: true, recipient: job.payload.email, subject: job.payload.subject });
    }
}
//# sourceMappingURL=email.js.map