export interface IJobProcessor<T = unknown, R = unknown> {
    process(job: {
        payload: T;
    }): Promise<R>;
    getType(): string;
    validate(payload: T): boolean;
}
export declare abstract class BaseJobProcessor<T = unknown, R = unknown> implements IJobProcessor<T, R> {
    abstract process(job: {
        payload: T;
    }): Promise<R>;
    abstract getType(): string;
    abstract validate(payload: T): boolean;
    protected createResult(data: R): R & {
        processedAt: string;
        processor: string;
    };
}
//# sourceMappingURL=base.d.ts.map