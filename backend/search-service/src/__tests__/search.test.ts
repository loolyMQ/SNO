import request from 'supertest';
import { createApp } from '../app';

// Mock Redis (изолируем от внешних сервисов)
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
});

// Mock Prometheus
jest.mock('prom-client', () => {
  const metricsStore: Record<string, unknown> = {};
  return {
    Registry: jest.fn().mockImplementation(() => ({
      contentType: 'text/plain',
      metrics: jest.fn().mockReturnValue('mock metrics'),
      registerMetric: jest.fn()
    })),
    collectDefaultMetrics: jest.fn(),
    Counter: jest.fn().mockImplementation(() => ({ inc: jest.fn(), observe: jest.fn() })),
  };
});

// Use real app factory
const createTestApp = () => createApp();

describe('Search Service', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /search', () => {
    it('should perform search with valid query', async () => {
      const response = await request(app)
        .get('/search')
        .query({ q: 'machine learning' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.query).toBe('machine learning');
      expect(response.body.results).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.results[0].title).toContain('Machine Learning');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/search')
        .query({ q: 'machine', limit: 1, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
    });

    it('should reject empty query', async () => {
      const response = await request(app)
        .get('/search')
        .query({ q: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid query');
    });

    it('should reject missing query', async () => {
      const response = await request(app)
        .get('/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid query');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('search-service');
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
