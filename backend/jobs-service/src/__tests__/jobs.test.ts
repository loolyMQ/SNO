const request = require('supertest');
import express, { Express } from 'express';
import { createApp } from '../app';
jest.mock('../metrics', () => ({
  createMetrics: () => ({
    register: { contentType: 'text/plain', metrics: jest.fn().mockReturnValue('mock metrics') },
    httpRequestCounter: { inc: jest.fn() }
  })
}));
const { z } = require('zod');

// Mock Prometheus
jest.mock('prom-client', () => {
  const mock = {
    Registry: jest.fn().mockImplementation(() => ({
      contentType: 'text/plain',
      metrics: jest.fn().mockReturnValue('mock metrics'),
      registerMetric: jest.fn()
    })),
    collectDefaultMetrics: jest.fn(),
    Counter: jest.fn().mockImplementation(() => ({ inc: jest.fn() })),
  };
  return { __esModule: true, default: mock, ...mock };
});

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJobs: jest.fn().mockResolvedValue([
      { id: 'job-1', name: 'data-processing', data: { type: 'process' }, getState: jest.fn().mockResolvedValue('completed') }
    ]),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
  })),
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
});

// Mock Prometheus
jest.mock('prom-client', () => ({
  register: {
    contentType: 'text/plain',
    metrics: jest.fn().mockReturnValue('mock metrics'),
  },
  collectDefaultMetrics: jest.fn(),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
}));

// Use real app factory
const createTestApp = () => createApp();

describe('Jobs Service', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /jobs', () => {
    it('should return list of jobs', async () => {
      const response = await request(app)
        .get('/jobs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.jobs[0]).toHaveProperty('id');
      expect(response.body.jobs[0]).toHaveProperty('type');
      expect(response.body.jobs[0]).toHaveProperty('status');
    });
  });

  describe('POST /jobs', () => {
    it('should create a new job with valid data', async () => {
      const jobData = {
        type: 'data-processing',
        data: { file: 'test.csv', operation: 'analyze' }
      };

      const response = await request(app)
        .post('/jobs')
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.job.type).toBe('data-processing');
      expect(response.body.job.status).toBe('queued');
      expect(response.body.message).toBe('Job created successfully');
    });

    it('should reject invalid job type', async () => {
      const invalidJobData = {
        type: 'invalid-type',
        data: { test: 'data' }
      };

      const response = await request(app)
        .post('/jobs')
        .send(invalidJobData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid job data');
    });

    it('should reject missing required fields', async () => {
      const incompleteJobData = {
        type: 'data-processing'
        // missing data field
      };

      const response = await request(app)
        .post('/jobs')
        .send(incompleteJobData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid job data');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('jobs-service');
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toBe('mock metrics');
      expect(response.headers['content-type']).toBe('text/plain');
    });
  });
});
