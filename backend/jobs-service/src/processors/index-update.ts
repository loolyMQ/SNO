import { BaseJobProcessor } from './base';

export interface IndexUpdatePayload { type: 'users'|'publications'|'institutions'|'graphs'; count: number; data?: unknown[] }
export interface IndexUpdateResult { indexUpdated: boolean; indexType: string; documentsProcessed: number; documentsSkipped: number }

export class IndexUpdateProcessor extends BaseJobProcessor<IndexUpdatePayload, IndexUpdateResult> {
  getType(): string { return 'index_update'; }
  validate(payload: IndexUpdatePayload): boolean { return Boolean(payload && ['users','publications','institutions','graphs'].includes(payload.type) && typeof payload.count === 'number'); }
  async process(job: { payload: IndexUpdatePayload }): Promise<IndexUpdateResult> {
    if (!this.validate(job.payload)) throw new Error('Invalid index update payload');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const processed = job.payload.count;
    const skipped = Math.floor(processed * 0.1);
    return this.createResult({ indexUpdated: true, indexType: job.payload.type, documentsProcessed: processed - skipped, documentsSkipped: skipped });
  }
}


