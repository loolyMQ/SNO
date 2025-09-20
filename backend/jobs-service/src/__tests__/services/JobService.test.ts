import { JobService } from '../../services/JobService';

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: jest.fn().mockResolvedValue({
      id: 'job-123',
      data: { type: 'test' },
      progress: jest.fn(),
      finished: jest.fn(),
      failed: jest.fn(),
    }),
    getJobs: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue([]),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('JobService', () => {
  let jobService: JobService;

  beforeEach(() => {
    jobService = new JobService();
  });

  describe('addJob', () => {
    it('should add a new job to the queue', async () => {
      const jobData = {
        type: 'process-graph',
        data: { graphId: '123' },
        priority: 1,
      };

      const result = await jobService.addJob(jobData);

      expect(result).toBeDefined();
      expect(result.id).toBe('job-123');
    });

    it('should add job with default priority', async () => {
      const jobData = {
        type: 'process-graph',
        data: { graphId: '123' },
      };

      const result = await jobService.addJob(jobData);

      expect(result).toBeDefined();
    });
  });

  describe('getJob', () => {
    it('should retrieve a job by ID', async () => {
      const job = await jobService.getJob('job-123');

      expect(job).toBeDefined();
      expect(job?.id).toBe('job-123');
    });

    it('should return null for non-existent job', async () => {
      // Mock getJob to return null
      const mockQueue = (jobService as any).queue;
      mockQueue.getJob.mockResolvedValueOnce(null);

      const job = await jobService.getJob('non-existent');

      expect(job).toBeNull();
    });
  });

  describe('getJobs', () => {
    it('should retrieve all jobs', async () => {
      const jobs = await jobService.getJobs();

      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should retrieve jobs by status', async () => {
      const jobs = await jobService.getJobs('completed');

      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('cleanJobs', () => {
    it('should clean completed jobs', async () => {
      const result = await jobService.cleanJobs('completed', 100);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should clean failed jobs', async () => {
      const result = await jobService.cleanJobs('failed', 50);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getJobStats', () => {
    it('should return job statistics', async () => {
      const stats = await jobService.getJobStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.waiting).toBe('number');
    });
  });

  describe('processGraphJob', () => {
    it('should process graph job successfully', async () => {
      const jobData = {
        graphId: '123',
        operation: 'update',
        data: { nodes: [], edges: [] },
      };

      const result = await jobService.processGraphJob(jobData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle graph job errors', async () => {
      const jobData = {
        graphId: null, // This should trigger the error
        operation: 'update',
        data: null,
      };

      const result = await jobService.processGraphJob(jobData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid graph data');
    });
  });

  describe('processSearchJob', () => {
    it('should process search job successfully', async () => {
      const jobData = {
        query: 'machine learning',
        filters: { type: 'topic' },
        userId: '123',
      };

      const result = await jobService.processSearchJob(jobData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('processAnalyticsJob', () => {
    it('should process analytics job successfully', async () => {
      const jobData = {
        type: 'graph-stats',
        graphId: '123',
        period: 'daily',
      };

      const result = await jobService.processAnalyticsJob(jobData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
