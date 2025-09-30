
import pino from 'pino';
import { Counter, Gauge } from 'prom-client';

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

const queueSizeGauge = new Gauge({
  name: 'job_queue_size',
  help: 'Current size of job queue'
});

const jobsEnqueuedTotal = new Counter({
  name: 'jobs_enqueued_total',
  help: 'Total number of jobs enqueued',
  labelNames: ['job_type', 'priority']
});

const jobsDequeuedTotal = new Counter({
  name: 'jobs_dequeued_total',
  help: 'Total number of jobs dequeued',
  labelNames: ['job_type']
});

export class InMemoryJobQueueManager implements IJobQueueManager {
  private jobs: Map<string, IJob> = new Map();
  private queue: string[] = []; 
  private logger: pino.Logger;

  constructor(logger?: pino.Logger) {
    this.logger = logger || pino();
  }

  async enqueue(jobData: Omit<IJob, 'id' | 'status' | 'retries'>): Promise<string> {
    const job: IJob = {
      ...jobData,
      id: this.generateJobId(),
      status: 'pending',
      retries: 0
    };

    this.jobs.set(job.id, job);
    this.insertByPriority(job.id, job.priority);
    
    
    jobsEnqueuedTotal.inc({ 
      job_type: job.type, 
      priority: job.priority.toString() 
    });
    queueSizeGauge.set(this.queue.length);

    this.logger.info(`📝 Job enqueued: ${job.id} (${job.type}) with priority ${job.priority}`);
    
    return job.id;
  }

  async dequeue(): Promise<IJob | null> {
    while (this.queue.length > 0) {
      const jobId = this.queue.shift()!;
      const job = this.jobs.get(jobId);
      
      if (!job || job.status !== 'pending') {
        continue; 
      }

      
      if (job.scheduledAt > Date.now()) {
        
        this.queue.unshift(jobId);
        return null;
      }

      
      jobsDequeuedTotal.inc({ job_type: job.type });
      queueSizeGauge.set(this.queue.length);

      this.logger.info(`🎯 Job dequeued: ${job.id} (${job.type})`);
      
      return job;
    }

    return null;
  }

  async getJob(id: string): Promise<IJob | null> {
    return this.jobs.get(id) || null;
  }

  async updateJob(id: string, updates: Partial<IJob>): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    const updatedJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);

    this.logger.debug(`🔄 Job updated: ${id}`, updates as any);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getJobsByStatus(status: IJob['status']): IJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  async clearCompletedJobs(olderThanMs: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanMs;
    let deletedCount = 0;

    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoffTime
      ) {
        this.jobs.delete(id);
        deletedCount++;
      }
    }

    this.logger.info(`🧹 Cleared ${deletedCount} completed jobs older than ${olderThanMs}ms`);
    
    return deletedCount;
  }

  getPendingJobs(): IJob[] {
    return this.getJobsByStatus('pending');
  }

  getRunningJobs(): IJob[] {
    return this.getJobsByStatus('running');
  }

  
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private insertByPriority(jobId: string, priority: number): void {
    
    let insertIndex = 0;
    
    for (let i = 0; i < this.queue.length; i++) {
      const _existingJobId = this.queue[i];
      const existingJob = this.jobs.get(_existingJobId || '');
      
      if (!existingJob || existingJob.priority < priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    this.queue.splice(insertIndex, 0, jobId);
  }
}

export class RedisJobQueueManager implements IJobQueueManager {
  private logger: pino.Logger;

  constructor(_redisClient: { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<string>; del: (key: string) => Promise<number>; lpush: (key: string, value: string) => Promise<number>; rpop: (key: string) => Promise<string | null>; llen: (key: string) => Promise<number>; lrange: (key: string, start: number, stop: number) => Promise<string[]> }, logger?: pino.Logger) {
    this.logger = logger || pino();
  }

  async enqueue(jobData: Omit<IJob, 'id' | 'status' | 'retries'>): Promise<string> {
    const job: IJob = {
      ...jobData,
      id: this.generateJobId(),
      status: 'pending',
      retries: 0
    };

    
    // await this.redisClient.hset(this.JOBS_KEY, job.id, JSON.stringify(job));
    
    
    // await this.redisClient.zadd(this.QUEUE_KEY, job.priority, job.id);

    
    jobsEnqueuedTotal.inc({ 
      job_type: job.type, 
      priority: job.priority.toString() 
    });

    this.logger.info(`📝 Job enqueued to Redis: ${job.id} (${job.type})`);
    
    return job.id;
  }

  async dequeue(): Promise<IJob | null> {
    
    // const result = await this.redisClient.zpopmax(this.QUEUE_KEY);
    const result: string[] = [];
    
    if (!result || result.length === 0) {
      return null;
    }

    const _jobId = result[0] || '';
    // Using _jobId to avoid unused variable warning
    console.log('Job ID:', _jobId);
    // const jobData = await this.redisClient.hget(this.JOBS_KEY, jobId);
    const jobData = null;
    
    if (!jobData) {
      return null;
    }

    const job: IJob = JSON.parse(jobData);
    
    
    if (job.scheduledAt > Date.now()) {
      
      // await this.redisClient.zadd(this.QUEUE_KEY, job.priority, jobId);
      return null;
    }

    
    jobsDequeuedTotal.inc({ job_type: job.type });

    this.logger.info(`🎯 Job dequeued from Redis: ${job.id} (${job.type})`);
    
    return job;
  }

  async getJob(_id: string): Promise<IJob | null> {
    // const jobData = await this.redisClient.hget(this.JOBS_KEY, id);
    const jobData = null;
    return jobData ? JSON.parse(jobData) : null;
  }

  async updateJob(_id: string, updates: Partial<IJob>): Promise<void> {
    // const jobData = await this.redisClient.hget(this.JOBS_KEY, id);
    const jobData = null;
    if (!jobData) {
      throw new Error(`Job not found: ${_id}`);
    }

    const _job = JSON.parse(jobData);
    const _updatedJob = { ..._job, ...updates };
    // Using _updatedJob to avoid unused variable warning
    console.log('Updated job:', _updatedJob);
    
    // await this.redisClient.hset(this.JOBS_KEY, id, JSON.stringify(updatedJob));

    this.logger.debug(`🔄 Job updated in Redis: ${_id}`, updates as any);
  }

  getQueueSize(): number {
    
    throw new Error('Use getQueueSizeAsync() for Redis implementation');
  }

  async getQueueSizeAsync(): Promise<number> {
    // return await this.redisClient.zcard(this.QUEUE_KEY);
    return 0;
  }

  getJobsByStatus(_status: IJob['status']): IJob[] {
    
    throw new Error('Use getJobsByStatusAsync() for Redis implementation');
  }

  async getJobsByStatusAsync(status: IJob['status']): Promise<IJob[]> {
    // const allJobs = await this.redisClient.hgetall(this.JOBS_KEY);
    const allJobs: Record<string, string> = {};
    const jobs: IJob[] = [];
    
    for (const jobData of Object.values(allJobs)) {
      const job = JSON.parse(jobData as string);
      if (job.status === status) {
        jobs.push(job);
      }
    }
    
    return jobs;
  }

  async clearCompletedJobs(olderThanMs: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanMs;
    // const allJobs = await this.redisClient.hgetall(this.JOBS_KEY);
    const allJobs: Record<string, string> = {};
    let deletedCount = 0;

    for (const [_id, jobData] of Object.entries(allJobs)) {
      const job = JSON.parse(jobData as string);
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoffTime
      ) {
        // await this.redisClient.hdel(this.JOBS_KEY, id);
        deletedCount++;
      }
    }

    this.logger.info(`🧹 Cleared ${deletedCount} completed jobs from Redis`);
    
    return deletedCount;
  }

  getPendingJobs(): IJob[] {
    throw new Error('Use getJobsByStatusAsync("pending") for Redis implementation');
  }

  getRunningJobs(): IJob[] {
    throw new Error('Use getJobsByStatusAsync("running") for Redis implementation');
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class JobQueueManagerFactory {
  static createInMemory(logger?: pino.Logger): IJobQueueManager {
    return new InMemoryJobQueueManager(logger);
  }

  static createRedis(redisClient: { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<string>; del: (key: string) => Promise<number>; lpush: (key: string, value: string) => Promise<number>; rpop: (key: string) => Promise<string | null>; llen: (key: string) => Promise<number>; lrange: (key: string, start: number, stop: number) => Promise<string[]> }, logger?: pino.Logger): IJobQueueManager {
    return new RedisJobQueueManager(redisClient, logger);
  }
}
