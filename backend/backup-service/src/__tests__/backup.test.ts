import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';

// Mock Prometheus
jest.mock('prom-client', () => ({
  Registry: jest.fn().mockImplementation(() => ({
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('mock metrics'),
    registerMetric: jest.fn(),
  })),
  collectDefaultMetrics: jest.fn(),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
}));

// Mock Kafka client
jest.mock('@science-map/shared', () => ({
  createKafkaClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock Pino logger
jest.mock('pino', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return jest.fn(() => mockLogger);
});

// Create test app using real createApp
const createTestApp = () => {
  const { app } = createApp();
  return app;
};

describe('Backup Service', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/backup/status', () => {
    it('should return backup service status', async () => {
      const response = await request(app)
        .get('/api/backup/status')
        .expect(200);

      expect(response.body.service).toBe('backup-service');
      expect(response.body.status).toBe('operational');
      expect(response.body).toHaveProperty('lastBackup');
      expect(response.body).toHaveProperty('nextBackup');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('backup-service');
      expect(response.body).toHaveProperty('timestamp');
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
