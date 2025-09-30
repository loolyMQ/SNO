import pino from 'pino';
export interface IJob {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    priority: number;
    scheduledAt: number;
    startedAt?: number;
    completedAt?: number;
    retries: number;
    maxRetries: number;
    error?: string;
    result?: unknown;
}
export interface IJobQueueManager {
    enqueue(job: Omit<IJob, 'id' | 'status' | 'retries'>): Promise<string>;
    dequeue(): Promise<IJob | null>;
    getJob(id: string): Promise<IJob | null>;
    updateJob(id: string, updates: Partial<IJob>): Promise<void>;
    getQueueSize(): number;
    getJobsByStatus(status: IJob['status']): IJob[];
    clearCompletedJobs(olderThanMs: number): Promise<number>;
    getPendingJobs(): IJob[];
    getRunningJobs(): IJob[];
}
export declare class InMemoryJobQueueManager implements IJobQueueManager {
    private jobs;
    private queue;
    private logger;
    constructor(logger?: pino.Logger);
    enqueue(jobData: Omit<IJob, 'id' | 'status' | 'retries'>): Promise<string>;
    dequeue(): Promise<IJob | null>;
    getJob(id: string): Promise<IJob | null>;
    updateJob(id: string, updates: Partial<IJob>): Promise<void>;
    getQueueSize(): number;
    getJobsByStatus(status: IJob['status']): IJob[];
    clearCompletedJobs(olderThanMs: number): Promise<number>;
    getPendingJobs(): IJob[];
    getRunningJobs(): IJob[];
    private generateJobId;
    private insertByPriority;
}
export declare class RedisJobQueueManager implements IJobQueueManager {
    private logger;
    constructor(_redisClient: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<string>;
        del: (key: string) => Promise<number>;
        lpush: (key: string, value: string) => Promise<number>;
        rpop: (key: string) => Promise<string | null>;
        llen: (key: string) => Promise<number>;
        lrange: (key: string, start: number, stop: number) => Promise<string[]>;
    }, logger?: pino.Logger);
    enqueue(jobData: Omit<IJob, 'id' | 'status' | 'retries'>): Promise<string>;
    dequeue(): Promise<IJob | null>;
    getJob(_id: string): Promise<IJob | null>;
    updateJob(_id: string, updates: Partial<IJob>): Promise<void>;
    getQueueSize(): number;
    getQueueSizeAsync(): Promise<number>;
    getJobsByStatus(_status: IJob['status']): IJob[];
    getJobsByStatusAsync(status: IJob['status']): Promise<IJob[]>;
    clearCompletedJobs(olderThanMs: number): Promise<number>;
    getPendingJobs(): IJob[];
    getRunningJobs(): IJob[];
    private generateJobId;
}
export declare class JobQueueManagerFactory {
    static createInMemory(logger?: pino.Logger): IJobQueueManager;
    static createRedis(redisClient: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<string>;
        del: (key: string) => Promise<number>;
        lpush: (key: string, value: string) => Promise<number>;
        rpop: (key: string) => Promise<string | null>;
        llen: (key: string) => Promise<number>;
        lrange: (key: string, start: number, stop: number) => Promise<string[]>;
    }, logger?: pino.Logger): IJobQueueManager;
}
//# sourceMappingURL=job-queue-manager.d.ts.map