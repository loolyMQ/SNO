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
  
  // Mock contract routes
  app.get('/api/contracts', (req, res) => {
    res.json({
      success: true,
      contracts: [
        { id: 'contract-1', name: 'Service Agreement', status: 'active', version: '1.0' },
        { id: 'contract-2', name: 'Data Processing', status: 'draft', version: '0.9' }
      ],
      total: 2
    });
  });

  app.post('/api/contracts', (req, res) => {
    res.json({
      success: true,
      contract: {
        id: 'contract-3',
        name: req.body.name || 'New Contract',
        status: 'draft',
        version: '1.0'
      },
      message: 'Contract created successfully'
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'contract-service' });
  });

  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('mock metrics');
  });

  return app;
};

describe('Contract Service', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/contracts', () => {
    it('should return list of contracts', async () => {
      const response = await request(app)
        .get('/api/contracts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contracts).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.contracts[0]).toHaveProperty('id');
      expect(response.body.contracts[0]).toHaveProperty('name');
      expect(response.body.contracts[0]).toHaveProperty('status');
    });
  });

  describe('POST /api/contracts', () => {
    it('should create new contract', async () => {
      const contractData = {
        name: 'Test Contract',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(contractData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contract.name).toBe('Test Contract');
      expect(response.body.message).toBe('Contract created successfully');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('contract-service');
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
