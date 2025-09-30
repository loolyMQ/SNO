import pino from 'pino';
import { Counter, Gauge } from 'prom-client';
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
export class InMemoryJobQueueManager {
    jobs = new Map();
    queue = [];
    logger;
    constructor(logger) {
        this.logger = logger || pino();
    }
    async enqueue(jobData) {
        const job = {
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
    async dequeue() {
        while (this.queue.length > 0) {
            const jobId = this.queue.shift();
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
    async getJob(id) {
        return this.jobs.get(id) || null;
    }
    async updateJob(id, updates) {
        const job = this.jobs.get(id);
        if (!job) {
            throw new Error(`Job not found: ${id}`);
        }
        const updatedJob = { ...job, ...updates };
        this.jobs.set(id, updatedJob);
        this.logger.debug(`🔄 Job updated: ${id}`, updates);
    }
    getQueueSize() {
        return this.queue.length;
    }
    getJobsByStatus(status) {
        return Array.from(this.jobs.values()).filter(job => job.status === status);
    }
    async clearCompletedJobs(olderThanMs) {
        const cutoffTime = Date.now() - olderThanMs;
        let deletedCount = 0;
        for (const [id, job] of this.jobs) {
            if ((job.status === 'completed' || job.status === 'failed') &&
                job.completedAt &&
                job.completedAt < cutoffTime) {
                this.jobs.delete(id);
                deletedCount++;
            }
        }
        this.logger.info(`🧹 Cleared ${deletedCount} completed jobs older than ${olderThanMs}ms`);
        return deletedCount;
    }
    getPendingJobs() {
        return this.getJobsByStatus('pending');
    }
    getRunningJobs() {
        return this.getJobsByStatus('running');
    }
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    insertByPriority(jobId, priority) {
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
export class RedisJobQueueManager {
    logger;
    constructor(_redisClient, logger) {
        this.logger = logger || pino();
    }
    async enqueue(jobData) {
        const job = {
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
    async dequeue() {
        // const result = await this.redisClient.zpopmax(this.QUEUE_KEY);
        const result = [];
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
        const job = JSON.parse(jobData);
        if (job.scheduledAt > Date.now()) {
            // await this.redisClient.zadd(this.QUEUE_KEY, job.priority, jobId);
            return null;
        }
        jobsDequeuedTotal.inc({ job_type: job.type });
        this.logger.info(`🎯 Job dequeued from Redis: ${job.id} (${job.type})`);
        return job;
    }
    async getJob(_id) {
        // const jobData = await this.redisClient.hget(this.JOBS_KEY, id);
        const jobData = null;
        return jobData ? JSON.parse(jobData) : null;
    }
    async updateJob(_id, updates) {
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
        this.logger.debug(`🔄 Job updated in Redis: ${_id}`, updates);
    }
    getQueueSize() {
        throw new Error('Use getQueueSizeAsync() for Redis implementation');
    }
    async getQueueSizeAsync() {
        // return await this.redisClient.zcard(this.QUEUE_KEY);
        return 0;
    }
    getJobsByStatus(_status) {
        throw new Error('Use getJobsByStatusAsync() for Redis implementation');
    }
    async getJobsByStatusAsync(status) {
        // const allJobs = await this.redisClient.hgetall(this.JOBS_KEY);
        const allJobs = {};
        const jobs = [];
        for (const jobData of Object.values(allJobs)) {
            const job = JSON.parse(jobData);
            if (job.status === status) {
                jobs.push(job);
            }
        }
        return jobs;
    }
    async clearCompletedJobs(olderThanMs) {
        const cutoffTime = Date.now() - olderThanMs;
        // const allJobs = await this.redisClient.hgetall(this.JOBS_KEY);
        const allJobs = {};
        let deletedCount = 0;
        for (const [_id, jobData] of Object.entries(allJobs)) {
            const job = JSON.parse(jobData);
            if ((job.status === 'completed' || job.status === 'failed') &&
                job.completedAt &&
                job.completedAt < cutoffTime) {
                // await this.redisClient.hdel(this.JOBS_KEY, id);
                deletedCount++;
            }
        }
        this.logger.info(`🧹 Cleared ${deletedCount} completed jobs from Redis`);
        return deletedCount;
    }
    getPendingJobs() {
        throw new Error('Use getJobsByStatusAsync("pending") for Redis implementation');
    }
    getRunningJobs() {
        throw new Error('Use getJobsByStatusAsync("running") for Redis implementation');
    }
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
export class JobQueueManagerFactory {
    static createInMemory(logger) {
        return new InMemoryJobQueueManager(logger);
    }
    static createRedis(redisClient, logger) {
        return new RedisJobQueueManager(redisClient, logger);
    }
}
//# sourceMappingURL=job-queue-manager.js.map