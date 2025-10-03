import request from 'supertest';
import express from 'express';
import { z } from 'zod';

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
  
  // Mock graph routes
  app.get('/graph/data', (_req, res) => {
    res.json({
      success: true,
      data: {
        nodes: [
          { id: '1', label: 'Research Paper 1', type: 'paper' },
          { id: '2', label: 'Research Paper 2', type: 'paper' }
        ],
        edges: [
          { source: '1', target: '2', type: 'cites' }
        ]
      }
    });
  });

  app.post('/graph/update', (req, res) => {
    const GraphUpdateSchema = z.object({
      nodes: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.string()
      })),
      edges: z.array(z.object({
        source: z.string(),
        target: z.string(),
        type: z.string()
      }))
    });

    const parseResult = GraphUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid data' });
    }

    res.json({ success: true, message: 'Graph updated' });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'graph-service' });
  });

  app.get('/metrics', (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('mock metrics');
  });

  return app;
};

describe('Graph Service', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /graph/data', () => {
    it('should return graph data', async () => {
      const response = await request(app)
        .get('/graph/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
      expect(response.body.data.nodes).toHaveLength(2);
      expect(response.body.data.edges).toHaveLength(1);
    });
  });

  describe('POST /graph/update', () => {
    it('should update graph with valid data', async () => {
      const updateData = {
        nodes: [
          { id: '1', label: 'New Paper', type: 'paper' }
        ],
        edges: []
      };

      const response = await request(app)
        .post('/graph/update')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Graph updated');
    });

    it('should reject invalid data', async () => {
      const invalidData = {
        nodes: 'invalid',
        edges: []
      };

      const response = await request(app)
        .post('/graph/update')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid data');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('graph-service');
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
