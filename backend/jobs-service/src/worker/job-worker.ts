
import pino from 'pino';
import { Counter, Histogram, Gauge } from 'prom-client';
import { IJobQueueManager, IJob } from '../queue/job-queue-manager';
import { JobProcessorFactory } from '../processors/job-processor-factory';
import { KafkaClient, EventTypes, Topics } from '@science-map/shared';

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

export class JobWorker implements IJobWorker {
  private isActive = false;
  private pollingTimer?: NodeJS.Timeout;
  private activeJobs = new Set<string>();
  private processingPromises = new Map<string, Promise<void>>();

  constructor(
    private queueManager: IJobQueueManager,
    private processorFactory: JobProcessorFactory,
    private kafkaClient: KafkaClient,
    private config: JobWorkerConfig,
    private logger: pino.Logger
  ) {}

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Worker is already running');
      return;
    }

    this.isActive = true;
    this.logger.info(`🚀 Starting job worker with config:`, this.config as any);

    
    this.startPolling();
  }

  async stop(): Promise<void> {
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

  isRunning(): boolean {
    return this.isActive;
  }

  getActiveJobsCount(): number {
    return this.activeJobs.size;
  }

  async processJob(job: IJob): Promise<void> {
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
      
      
      const result = await this.executeWithTimeout(
        () => processor.process(job),
        this.config.jobTimeoutMs
      );

      
      await this.handleJobSuccess(job, result, startTime);

    } catch (error: unknown) {
      
      await this.handleJobError(job, error as Error, startTime);
    } finally {
      
      this.activeJobs.delete(job.id);
      jobsActiveTotal.dec();
      this.processingPromises.delete(job.id);
    }
  }

  
  private startPolling(): void {
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
        } else {
          
          this.scheduleNextPoll();
        }
      } catch (error) {
        this.logger.error({ err: error as Error }, 'Error in polling loop');
        workerErrorsTotal.inc({ error_type: 'polling' });
        this.scheduleNextPoll();
      }
    };

    poll();
  }

  private scheduleNextPoll(delayMs?: number): void {
    if (!this.isActive) {
      return;
    }

    const delay = delayMs ?? this.config.pollingIntervalMs;
    this.pollingTimer = setTimeout(() => this.startPolling(), delay);
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
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

  private async handleJobSuccess(job: IJob, result: unknown, startTime: number): Promise<void> {
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
        userId: (job as any).userId || 'system'
      });
    } catch (kafkaError) {
      this.logger.error(`Failed to publish job completed event: ${kafkaError}`);
      workerErrorsTotal.inc({ error_type: 'kafka_publish' });
    }
  }

  private async handleJobError(job: IJob, error: Error, startTime: number): Promise<void> {
    const duration = Date.now() - startTime;
    
    this.logger.error({ err: error as Error }, `❌ Job ${job.id} failed`);

    
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
          userId: (job as any).userId || 'system'
        });
      } catch (kafkaError) {
        this.logger.error(`Failed to publish job failed event: ${kafkaError}`);
        workerErrorsTotal.inc({ error_type: 'kafka_publish' });
      }
    } else {
      
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

  private calculateRetryDelay(retryNumber: number): number {
    
    const baseDelay = this.config.retryDelayMs;
    const exponentialDelay = baseDelay * Math.pow(2, retryNumber - 1);
    const jitter = Math.random() * 1000; 
    
    return Math.min(exponentialDelay + jitter, 60000); 
  }
}

export class JobWorkerFactory {
  static create(
    queueManager: IJobQueueManager,
    processorFactory: JobProcessorFactory,
    kafkaClient: KafkaClient,
    config: Partial<JobWorkerConfig> = {},
    logger?: pino.Logger
  ): IJobWorker {
    const defaultConfig: JobWorkerConfig = {
      maxConcurrentJobs: 5,
      pollingIntervalMs: 1000,
      retryDelayMs: 5000,
      jobTimeoutMs: 300000 
    };

    const finalConfig = { ...defaultConfig, ...config };
    const finalLogger = logger || pino();

    return new JobWorker(
      queueManager,
      processorFactory,
      kafkaClient,
      finalConfig,
      finalLogger
    );
  }
}
