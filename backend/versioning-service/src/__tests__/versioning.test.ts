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

describe('Versioning Service', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/versions', () => {
    it('should return versioning service status', async () => {
      const response = await request(app)
        .get('/api/versions')
        .expect(200);

      expect(response.body.service).toBe('versioning-service');
      expect(response.body.status).toBe('operational');
      expect(response.body.versions).toHaveProperty('current');
      expect(response.body.versions).toHaveProperty('latest');
      expect(response.body.versions).toHaveProperty('supported');
      expect(response.body.versions.supported).toEqual(['1.0.0']);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('versioning-service');
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
