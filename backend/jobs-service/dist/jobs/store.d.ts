import { Job } from './types';
export declare class InMemoryJobStore {
    private jobs;
    private queue;
    add(job: Job): void;
    get(id: string): Job | undefined;
    delete(id: string): void;
    next(): string | undefined;
    stats(): {
        total: number;
        pending: number;
        running: number;
        completed: number;
        failed: number;
        queueSize: number;
    };
    allMinimal(): {
        id: string;
        type: string;
        status: "completed" | "running" | "pending" | "failed";
        priority: number;
        createdAt: number;
        startedAt: number | undefined;
        completedAt: number | undefined;
        retries: number;
        maxRetries: number;
    }[];
}
//# sourceMappingURL=store.d.ts.map