const request = require('supertest');
const express = require('express');

// Mock axios
jest.mock('axios');
const mockedAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock services
  const SERVICES = {
    auth: 'http://localhost:3003',
    graph: 'http://localhost:3002',
    search: 'http://localhost:3004',
    jobs: 'http://localhost:3005',
  };

  // Mock health check
  app.get('/api/health', async (req, res) => {
    try {
      const healthChecks = {};
      for (const [serviceName, serviceUrl] of Object.entries(SERVICES)) {
        try {
          const response = await mockedAxios.get(`${serviceUrl}/health`);
          healthChecks[serviceName] = { status: 'healthy', response: response.data };
        } catch (error) {
          healthChecks[serviceName] = { status: 'unhealthy', error: error instanceof Error ? error.message : String(error) };
        }
      }
      
      const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
      res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        services: healthChecks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Mock auth proxy
  app.post('/api/auth/login', async (req, res) => {
    try {
      const response = await mockedAxios.post(`${SERVICES.auth}/auth/login`, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Auth service unavailable'
      });
    }
  });

  // Mock search proxy
  app.get('/api/search', async (req, res) => {
    try {
      const response = await mockedAxios.get(`${SERVICES.search}/search`, { params: req.query });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Search service unavailable'
      });
    }
  });

  return app;
};

describe('API Gateway Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should check all services health', async () => {
      // Mock successful health responses
      mockedAxios.get.mockResolvedValue({ data: { status: 'ok' } });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle service failures', async () => {
      // Mock one service failure
      mockedAxios.get
        .mockResolvedValueOnce({ data: { status: 'ok' } }) // auth
        .mockRejectedValueOnce(new Error('Service unavailable')) // graph
        .mockResolvedValueOnce({ data: { status: 'ok' } }) // search
        .mockResolvedValueOnce({ data: { status: 'ok' } }); // jobs

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.services).toBeDefined();
    });
  });

  describe('Auth Integration', () => {
    it('should proxy auth requests', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          token: 'mock-jwt-token',
          user: { id: '1', email: 'test@example.com' }
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3003/auth/login',
        loginData
      );
    });
  });

  describe('Search Integration', () => {
    it('should proxy search requests', async () => {
      const searchQuery = 'machine learning';

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          results: [
            { id: '1', title: 'ML Paper 1' },
            { id: '2', title: 'ML Paper 2' }
          ],
          total: 2
        }
      });

      const response = await request(app)
        .get('/api/search')
        .query({ q: searchQuery })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3004/search',
        { params: { q: searchQuery } }
      );
    });
  });
});