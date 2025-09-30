export interface IJobProcessor<T = unknown, R = unknown> {
  process(job: { payload: T }): Promise<R>;
  getType(): string;
  validate(payload: T): boolean;
}

export abstract class BaseJobProcessor<T = unknown, R = unknown> implements IJobProcessor<T, R> {
  abstract process(job: { payload: T }): Promise<R>;
  abstract getType(): string;
  abstract validate(payload: T): boolean;

  protected createResult(data: R): R & { processedAt: string; processor: string } {
    return {
      ...(data as object),
      processedAt: new Date().toISOString(),
      processor: this.getType()
    } as R & { processedAt: string; processor: string };
  }
}


