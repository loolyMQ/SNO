import pino from 'pino';
import { Counter, Histogram, Gauge } from 'prom-client';
import { EventTypes, Topics } from '@science-map/shared';
const jobsActiveTotal = new Gauge({
    name: 'jobs_active_total',
    help: 'Number of currently active jobs'
});
const jobsCompletedTotal = new Counter({
    name: 'jobs_completed_total',
    help: 'Total number of completed jobs',
    labelNames: ['job_type', 'status']
});
const jobExecutionDuration = new Histogram({
    name: 'job_execution_duration_seconds',
    help: 'Duration of job execution',
    labelNames: ['job_type', 'status']
});
const workerErrorsTotal = new Counter({
    name: 'worker_errors_total',
    help: 'Total number of worker errors',
    labelNames: ['error_type']
});
// interface JobCompletedEvent {
//   type: typeof EventTypes.JOB_COMPLETED;
//   jobId: string;
//   jobType: string;
//   result: unknown;
//   duration: number;
//   timestamp: number;
// }
// interface JobFailedEvent {
//   type: typeof EventTypes.JOB_FAILED;
//   jobId: string;
//   jobType: string;
//   error: string;
//   retries: number;
//   timestamp: number;
// }
export class JobWorker {
    queueManager;
    processorFactory;
    kafkaClient;
    config;
    logger;
    isActive = false;
    pollingTimer;
    activeJobs = new Set();
    processingPromises = new Map();
    constructor(queueManager, processorFactory, kafkaClient, config, logger) {
        this.queueManager = queueManager;
        this.processorFactory = processorFactory;
        this.kafkaClient = kafkaClient;
        this.config = config;
        this.logger = logger;
    }
    async start() {
        if (this.isActive) {
            this.logger.warn('Worker is already running');
            return;
        }
        this.isActive = true;
        this.logger.info(`🚀 Starting job worker with config:`, this.config);
        this.startPolling();
    }
    async stop() {
        if (!this.isActive) {
            return;
        }
        this.logger.info('🛑 Stopping job worker...');
        this.isActive = false;
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
        }
        if (this.processingPromises.size > 0) {
            this.logger.info(`⏳ Waiting for ${this.processingPromises.size} active jobs to complete...`);
            await Promise.allSettled(Array.from(this.processingPromises.values()));
        }
        this.logger.info('✅ Job worker stopped');
    }
    isRunning() {
        return this.isActive;
    }
    getActiveJobsCount() {
        return this.activeJobs.size;
    }
    async processJob(job) {
        const startTime = Date.now();
        try {
            if (this.activeJobs.has(job.id)) {
                this.logger.warn(`Job ${job.id} is already being processed`);
                return;
            }
            this.activeJobs.add(job.id);
            jobsActiveTotal.inc();
            await this.queueManager.updateJob(job.id, {
                status: 'running',
                startedAt: Date.now()
            });
            this.logger.info(`⚡ Starting job ${job.id} (${job.type})`);
            const processor = this.processorFactory.createProcessor(job.type);
            const result = await this.executeWithTimeout(() => processor.process(job), this.config.jobTimeoutMs);
            await this.handleJobSuccess(job, result, startTime);
        }
        catch (error) {
            await this.handleJobError(job, error, startTime);
        }
        finally {
            this.activeJobs.delete(job.id);
            jobsActiveTotal.dec();
            this.processingPromises.delete(job.id);
        }
    }
    startPolling() {
        if (!this.isActive) {
            return;
        }
        const poll = async () => {
            try {
                if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
                    this.scheduleNextPoll();
                    return;
                }
                const job = await this.queueManager.dequeue();
                if (job) {
                    const processingPromise = this.processJob(job);
                    this.processingPromises.set(job.id, processingPromise);
                    this.scheduleNextPoll(0);
                }
                else {
                    this.scheduleNextPoll();
                }
            }
            catch (error) {
                this.logger.error({ err: error }, 'Error in polling loop');
                workerErrorsTotal.inc({ error_type: 'polling' });
                this.scheduleNextPoll();
            }
        };
        poll();
    }
    scheduleNextPoll(delayMs) {
        if (!this.isActive) {
            return;
        }
        const delay = delayMs ?? this.config.pollingIntervalMs;
        this.pollingTimer = setTimeout(() => this.startPolling(), delay);
    }
    async executeWithTimeout(fn, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Job execution timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            fn()
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }
    async handleJobSuccess(job, result, startTime) {
        const duration = Date.now() - startTime;
        await this.queueManager.updateJob(job.id, {
            status: 'completed',
            completedAt: Date.now(),
            result
        });
        jobsCompletedTotal.inc({ job_type: job.type, status: 'success' });
        jobExecutionDuration.observe({ job_type: job.type, status: 'success' }, duration / 1000);
        this.logger.info(`✅ Job ${job.id} completed successfully in ${duration}ms`);
        try {
            const event = {
                type: EventTypes.JOB_COMPLETED,
                jobId: job.id,
                jobType: job.type,
                result,
                duration,
                timestamp: Date.now()
            };
            await this.kafkaClient.publish(Topics.JOB_EVENTS, {
                type: EventTypes.JOB_COMPLETED,
                payload: event,
                correlationId: `job_${job.id}_${Date.now()}`,
                userId: job.userId || 'system'
            });
        }
        catch (kafkaError) {
            this.logger.error(`Failed to publish job completed event: ${kafkaError}`);
            workerErrorsTotal.inc({ error_type: 'kafka_publish' });
        }
    }
    async handleJobError(job, error, startTime) {
        const duration = Date.now() - startTime;
        this.logger.error({ err: error }, `❌ Job ${job.id} failed`);
        const newRetries = job.retries + 1;
        if (newRetries >= job.maxRetries) {
            await this.queueManager.updateJob(job.id, {
                status: 'failed',
                completedAt: Date.now(),
                retries: newRetries,
                error: error.message
            });
            jobsCompletedTotal.inc({ job_type: job.type, status: 'failed' });
            jobExecutionDuration.observe({ job_type: job.type, status: 'failed' }, duration / 1000);
            this.logger.error(`💀 Job ${job.id} failed permanently after ${newRetries} attempts`);
            try {
                const event = {
                    type: EventTypes.JOB_FAILED,
                    jobId: job.id,
                    jobType: job.type,
                    error: error.message,
                    retries: newRetries,
                    timestamp: Date.now()
                };
                await this.kafkaClient.publish(Topics.JOB_EVENTS, {
                    type: EventTypes.JOB_FAILED,
                    payload: event,
                    correlationId: `job_${job.id}_${Date.now()}`,
                    userId: job.userId || 'system'
                });
            }
            catch (kafkaError) {
                this.logger.error(`Failed to publish job failed event: ${kafkaError}`);
                workerErrorsTotal.inc({ error_type: 'kafka_publish' });
            }
        }
        else {
            const retryDelay = this.calculateRetryDelay(newRetries);
            await this.queueManager.updateJob(job.id, {
                status: 'pending',
                retries: newRetries,
                scheduledAt: Date.now() + retryDelay,
                error: error.message
            });
            await this.queueManager.enqueue({
                type: job.type,
                payload: job.payload,
                priority: job.priority,
                scheduledAt: Date.now() + retryDelay,
                maxRetries: job.maxRetries
            });
            this.logger.warn(`🔄 Job ${job.id} scheduled for retry ${newRetries}/${job.maxRetries} in ${retryDelay}ms`);
        }
        workerErrorsTotal.inc({ error_type: 'job_execution' });
    }
    calculateRetryDelay(retryNumber) {
        const baseDelay = this.config.retryDelayMs;
        const exponentialDelay = baseDelay * Math.pow(2, retryNumber - 1);
        const jitter = Math.random() * 1000;
        return Math.min(exponentialDelay + jitter, 60000);
    }
}
export class JobWorkerFactory {
    static create(queueManager, processorFactory, kafkaClient, config = {}, logger) {
        const defaultConfig = {
            maxConcurrentJobs: 5,
            pollingIntervalMs: 1000,
            retryDelayMs: 5000,
            jobTimeoutMs: 300000
        };
        const finalConfig = { ...defaultConfig, ...config };
        const finalLogger = logger || pino();
        return new JobWorker(queueManager, processorFactory, kafkaClient, finalConfig, finalLogger);
    }
}
//# sourceMappingURL=job-worker.js.map