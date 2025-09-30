import { BaseJobProcessor } from './base';
export class CleanupProcessor extends BaseJobProcessor {
    getType() { return 'cleanup'; }
    validate(payload) { return Boolean(payload && ['logs', 'cache', 'temp_files', 'old_exports'].includes(payload.target)); }
    async process(job) {
        if (!this.validate(job.payload))
            throw new Error('Invalid cleanup payload');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.createResult({ target: job.payload.target, cleanedItems: Math.floor(Math.random() * 1000) + 10, freedSpace: Math.floor(Math.random() * 1024 * 1024 * 100), duration: 1500 });
    }
}
//# sourceMappingURL=cleanup.js.map