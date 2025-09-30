import { BaseJobProcessor } from './base';

export interface CleanupPayload { target: 'logs'|'cache'|'temp_files'|'old_exports'; olderThanDays?: number }
export interface CleanupResult { target: string; cleanedItems: number; freedSpace: number; duration: number }

export class CleanupProcessor extends BaseJobProcessor<CleanupPayload, CleanupResult> {
  getType(): string { return 'cleanup'; }
  validate(payload: CleanupPayload): boolean { return Boolean(payload && ['logs','cache','temp_files','old_exports'].includes(payload.target)); }
  async process(job: { payload: CleanupPayload }): Promise<CleanupResult> {
    if (!this.validate(job.payload)) throw new Error('Invalid cleanup payload');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return this.createResult({ target: job.payload.target, cleanedItems: Math.floor(Math.random()*1000)+10, freedSpace: Math.floor(Math.random()*1024*1024*100), duration: 1500 });
  }
}


