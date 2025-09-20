import { Queue, Worker, Job } from 'bullmq';

export interface JobData {
  type: string;
  data: any;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface JobStats {
  total: number;
  completed: number;
  failed: number;
  active: number;
  waiting: number;
}

export class JobService {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    this.queue = new Queue('science-map-jobs', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.worker = new Worker('science-map-jobs', this.processJob.bind(this), {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.setupWorkerEvents();
  }

  private setupWorkerEvents(): void {
    this.worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async addJob(jobData: JobData): Promise<Job> {
    const job = await this.queue.add(
      jobData.type,
      jobData.data,
      {
        priority: jobData.priority || 0,
        delay: jobData.delay || 0,
        attempts: jobData.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`📝 Job ${job.id} added to queue`);
    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.queue.getJob(jobId);
  }

  async getJobs(status?: string): Promise<Job[]> {
    if (status) {
      return this.queue.getJobs([status as any]);
    }
    return this.queue.getJobs(['waiting', 'active', 'completed', 'failed']);
  }

  async cleanJobs(status: string, maxAge: number): Promise<Job[]> {
    return this.queue.clean(maxAge, 100, status as any);
  }

  async getJobStats(): Promise<JobStats> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getJobs(['waiting']),
      this.queue.getJobs(['active']),
      this.queue.getJobs(['completed']),
      this.queue.getJobs(['failed']),
    ]);

    return {
      total: waiting.length + active.length + completed.length + failed.length,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  private async processJob(job: Job): Promise<JobResult> {
    console.log(`🔄 Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'process-graph':
          return await this.processGraphJob(job.data);
        case 'process-search':
          return await this.processSearchJob(job.data);
        case 'process-analytics':
          return await this.processAnalyticsJob(job.data);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async processGraphJob(data: any): Promise<JobResult> {
    try {
      // Simulate graph processing
      await this.processGraphData(data);
      
      return {
        success: true,
        data: { processed: true, timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Graph processing failed',
      };
    }
  }

  async processSearchJob(data: any): Promise<JobResult> {
    try {
      // Simulate search processing
      await this.processSearchData(data);
      
      return {
        success: true,
        data: { results: [], timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search processing failed',
      };
    }
  }

  async processAnalyticsJob(data: any): Promise<JobResult> {
    try {
      // Simulate analytics processing
      await this.processAnalyticsData(data);
      
      return {
        success: true,
        data: { analytics: {}, timestamp: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analytics processing failed',
      };
    }
  }

  private async processGraphData(data: any): Promise<void> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!data || !data.graphId) {
      throw new Error('Invalid graph data');
    }
  }

  private async processSearchData(data: any): Promise<void> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!data || !data.query) {
      throw new Error('Invalid search data');
    }
  }

  private async processAnalyticsData(data: any): Promise<void> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!data || !data.type) {
      throw new Error('Invalid analytics data');
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}


