import pino from 'pino';
import { IJobQueueManager, IJob } from '../queue/job-queue-manager';
import { JobProcessorFactory } from '../processors/job-processor-factory';
import { KafkaClient } from '@science-map/shared';
export interface IJobWorker {
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getActiveJobsCount(): number;
    processJob(job: IJob): Promise<void>;
}
export interface JobWorkerConfig {
    maxConcurrentJobs: number;
    pollingIntervalMs: number;
    retryDelayMs: number;
    jobTimeoutMs: number;
}
export declare class JobWorker implements IJobWorker {
    private queueManager;
    private processorFactory;
    private kafkaClient;
    private config;
    private logger;
    private isActive;
    private pollingTimer?;
    private activeJobs;
    private processingPromises;
    constructor(queueManager: IJobQueueManager, processorFactory: JobProcessorFactory, kafkaClient: KafkaClient, config: JobWorkerConfig, logger: pino.Logger);
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    getActiveJobsCount(): number;
    processJob(job: IJob): Promise<void>;
    private startPolling;
    private scheduleNextPoll;
    private executeWithTimeout;
    private handleJobSuccess;
    private handleJobError;
    private calculateRetryDelay;
}
export declare class JobWorkerFactory {
    static create(queueManager: IJobQueueManager, processorFactory: JobProcessorFactory, kafkaClient: KafkaClient, config?: Partial<JobWorkerConfig>, logger?: pino.Logger): IJobWorker;
}
//# sourceMappingURL=job-worker.d.ts.map