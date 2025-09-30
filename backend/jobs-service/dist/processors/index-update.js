import { BaseJobProcessor } from './base';
export class IndexUpdateProcessor extends BaseJobProcessor {
    getType() { return 'index_update'; }
    validate(payload) { return Boolean(payload && ['users', 'publications', 'institutions', 'graphs'].includes(payload.type) && typeof payload.count === 'number'); }
    async process(job) {
        if (!this.validate(job.payload))
            throw new Error('Invalid index update payload');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const processed = job.payload.count;
        const skipped = Math.floor(processed * 0.1);
        return this.createResult({ indexUpdated: true, indexType: job.payload.type, documentsProcessed: processed - skipped, documentsSkipped: skipped });
    }
}
//# sourceMappingURL=index-update.js.map