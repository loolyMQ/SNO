const request = require('supertest');
const express = require('express');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

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
          const response = await axios.get(`${serviceUrl}/health`);
          healthChecks[serviceName] = { status: 'healthy', response: response.data };
        } catch (error) {
          healthChecks[serviceName] = { status: 'unhealthy', error: error instanceof Error ? error.message : String(error) };
        }
      }
      res.json({ success: true, services: healthChecks });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Health check failed' });
    }
  });

  // Mock auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const response = await axios.post(`${SERVICES.auth}/auth/login`, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Auth service error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const response = await axios.post(`${SERVICES.auth}/auth/register`, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Auth service error' });
    }
  });

  // Mock search routes
  app.get('/api/search', async (req, res) => {
    try {
      const response = await axios.get(`${SERVICES.search}/search`, { params: req.query });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Search service error' });
    }
  });

  // Mock graph routes
  app.get('/api/graph/data', async (req, res) => {
    try {
      const response = await axios.get(`${SERVICES.graph}/graph/data`);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Graph service error' });
    }
  });

  app.post('/api/graph/update', async (req, res) => {
    try {
      const response = await axios.post(`${SERVICES.graph}/graph/update`, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Graph service error' });
    }
  });

  // Mock jobs routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const response = await axios.get(`${SERVICES.jobs}/jobs`);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Jobs service error' });
    }
  });

  app.post('/api/jobs', async (req, res) => {
    try {
      const response = await axios.post(`${SERVICES.jobs}/jobs`, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Jobs service error' });
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
      mockedAxios.get
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'auth-service' } }) // auth
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'graph-service' } }) // graph
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'search-service' } }) // search
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'jobs-service' } }); // jobs

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toHaveProperty('auth');
      expect(response.body.services).toHaveProperty('graph');
      expect(response.body.services).toHaveProperty('search');
      expect(response.body.services).toHaveProperty('jobs');
      
      expect(response.body.services.auth.status).toBe('healthy');
      expect(response.body.services.graph.status).toBe('healthy');
      expect(response.body.services.search.status).toBe('healthy');
      expect(response.body.services.jobs.status).toBe('healthy');
    });

    it('should handle service failures', async () => {
      // Mock one service failure
      mockedAxios.get
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'auth-service' } }) // auth
        .mockRejectedValueOnce(new Error('Service unavailable')) // graph
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'search-service' } }) // search
        .mockResolvedValueOnce({ data: { status: 'ok', service: 'jobs-service' } }); // jobs

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services.auth.status).toBe('healthy');
      expect(response.body.services.graph.status).toBe('unhealthy');
      expect(response.body.services.search.status).toBe('healthy');
      expect(response.body.services.jobs.status).toBe('healthy');
    });
  });

  describe('Auth Integration', () => {
    it('should proxy login requests', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true, token: 'mock-jwt-token', user: { id: '1', email: 'test@example.com' } }
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

    it('should proxy register requests', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123'
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true, user: { id: '2', email: 'newuser@example.com' } }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3003/auth/register',
        registerData
      );
    });
  });

  describe('Search Integration', () => {
    it('should proxy search requests', async () => {
      const searchQuery = { q: 'machine learning', limit: 10 };

      mockedAxios.get.mockResolvedValue({
        data: { 
          success: true, 
          results: [
            { id: '1', title: 'Machine Learning Paper', score: 0.95 }
          ],
          total: 1
        }
      });

      const response = await request(app)
        .get('/api/search')
        .query(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3004/search',
        { params: searchQuery }
      );
    });
  });

  describe('Graph Integration', () => {
    it('should proxy graph data requests', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 
          success: true, 
          data: {
            nodes: [{ id: '1', label: 'Paper 1', type: 'paper' }],
            edges: []
          }
        }
      });

      const response = await request(app)
        .get('/api/graph/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
    });

    it('should proxy graph update requests', async () => {
      const updateData = {
        nodes: [{ id: '1', label: 'New Paper', type: 'paper' }],
        edges: []
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true, message: 'Graph updated' }
      });

      const response = await request(app)
        .post('/api/graph/update')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Graph updated');
    });
  });

  describe('Jobs Integration', () => {
    it('should proxy jobs list requests', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 
          success: true, 
          jobs: [
            { id: 'job-1', name: 'data-processing', state: 'completed' }
          ],
          total: 1
        }
      });

      const response = await request(app)
        .get('/api/jobs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toHaveLength(1);
    });

    it('should proxy job creation requests', async () => {
      const jobData = {
        type: 'data-processing',
        data: { file: 'test.csv' }
      };

      mockedAxios.post.mockResolvedValue({
        data: { success: true, job: { id: 'job-1', type: 'data-processing', status: 'queued' } }
      });

      const response = await request(app)
        .post('/api/jobs')
        .send(jobData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.type).toBe('data-processing');
    });
  });
});
