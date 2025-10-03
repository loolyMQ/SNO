export interface Job {
  id: string;
  name: string;
  type: string;
  status: JobStatus;
  priority: JobPriority;
  data: Record<string, unknown>;
  options: JobOptions;
  progress: JobProgress;
  result?: unknown;
  error?: JobError;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  repeat?: JobRepeat;
}

export type JobStatus = 
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'stuck';

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: JobBackoff;
  removeOnComplete?: number;
  removeOnFail?: number;
  jobId?: string;
  timestamp?: number;
}

export interface JobBackoff {
  type: 'fixed' | 'exponential';
  delay: number;
}

export interface JobProgress {
  processed: number;
  total: number;
  percentage: number;
  message?: string;
}

export interface JobError {
  message: string;
  stack?: string;
  code?: string;
  data?: Record<string, unknown>;
}

export interface JobRepeat {
  pattern: string;
  tz?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface JobQueue {
  name: string;
  type: string;
  concurrency: number;
  rateLimiter?: JobRateLimiter;
  defaultJobOptions: JobOptions;
  settings: JobQueueSettings;
}

export interface JobRateLimiter {
  max: number;
  duration: number;
  bounceBack: boolean;
}

export interface JobQueueSettings {
  stalledInterval: number;
  maxStalledCount: number;
  retryProcessDelay: number;
}

export interface JobProcessor {
  name: string;
  concurrency: number;
  processor: (_job: Job) => Promise<unknown>;
}

export interface JobEvent {
  type: 'waiting' | 'active' | 'completed' | 'failed' | 'stalled' | 'progress' | 'removed';
  jobId: string;
  _job: Job;
  timestamp: Date;
}

export interface JobMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  processed: number;
  throughput: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

export interface JobWorker {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  concurrency: number;
  processed: number;
  failed: number;
  startedAt: Date;
  lastProcessedAt?: Date;
}

export interface JobScheduler {
  id: string;
  name: string;
  pattern: string;
  jobData: Record<string, unknown>;
  jobOptions: JobOptions;
  isActive: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
