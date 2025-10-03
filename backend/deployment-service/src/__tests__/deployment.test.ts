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
  
  // Mock deployment routes
  app.get('/api/deployments', (req, res) => {
    res.json({
      success: true,
      deployments: [
        { id: 'deploy-1', service: 'api-gateway', status: 'running', version: '1.0.0' },
        { id: 'deploy-2', service: 'auth-service', status: 'deploying', version: '1.1.0' }
      ],
      total: 2
    });
  });

  app.post('/api/deployments', (req, res) => {
    res.json({
      success: true,
      deployment: {
        id: 'deploy-3',
        service: req.body.service || 'new-service',
        status: 'pending',
        version: req.body.version || '1.0.0'
      },
      message: 'Deployment started successfully'
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'deployment-service' });
  });

  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('mock metrics');
  });

  return app;
};

describe('Deployment Service', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/deployments', () => {
    it('should return list of deployments', async () => {
      const response = await request(app)
        .get('/api/deployments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deployments).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.deployments[0]).toHaveProperty('id');
      expect(response.body.deployments[0]).toHaveProperty('service');
      expect(response.body.deployments[0]).toHaveProperty('status');
    });
  });

  describe('POST /api/deployments', () => {
    it('should start new deployment', async () => {
      const deploymentData = {
        service: 'test-service',
        version: '2.0.0'
      };

      const response = await request(app)
        .post('/api/deployments')
        .send(deploymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deployment.service).toBe('test-service');
      expect(response.body.message).toBe('Deployment started successfully');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('deployment-service');
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
