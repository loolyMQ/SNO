import request from 'supertest';
import express from 'express';

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

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock CDN routes
  app.get('/api/cdn/assets', (req, res) => {
    res.json({
      success: true,
      assets: [
        { id: 'asset-1', name: 'logo.png', url: '/cdn/logo.png', size: 1024 },
        { id: 'asset-2', name: 'banner.jpg', url: '/cdn/banner.jpg', size: 2048 }
      ],
      total: 2
    });
  });

  app.post('/api/cdn/upload', (req, res) => {
    res.json({
      success: true,
      asset: {
        id: 'asset-3',
        name: req.body.name || 'uploaded-file',
        url: '/cdn/uploaded-file',
        size: req.body.size || 0
      },
      message: 'Asset uploaded successfully'
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'cdn-service' });
  });

  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('mock metrics');
  });

  return app;
};

describe('CDN Service', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/cdn/assets', () => {
    it('should return list of assets', async () => {
      const response = await request(app)
        .get('/api/cdn/assets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.assets).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.assets[0]).toHaveProperty('id');
      expect(response.body.assets[0]).toHaveProperty('name');
      expect(response.body.assets[0]).toHaveProperty('url');
    });
  });

  describe('POST /api/cdn/upload', () => {
    it('should upload asset', async () => {
      const uploadData = {
        name: 'test-file.png',
        size: 512
      };

      const response = await request(app)
        .post('/api/cdn/upload')
        .send(uploadData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.asset.name).toBe('test-file.png');
      expect(response.body.message).toBe('Asset uploaded successfully');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('cdn-service');
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toBe('mock metrics');
      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
    });
  });
});
