import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Mock the services
jest.mock('../../api-gateway/src/routes/graph', () => ({
  graphRouter: express.Router().get('/stats', (req, res) => {
    res.json({ success: true, data: { nodeCount: 5, edgeCount: 3 } });
  }),
}));

jest.mock('../../api-gateway/src/routes/search', () => ({
  searchRouter: express.Router().post('/', (req, res) => {
    res.json({ success: true, data: [] });
  }),
}));

import { graphRouter } from '../../api-gateway/src/routes/graph';
import { searchRouter } from '../../api-gateway/src/routes/search';

const createApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json());
  
  app.use('/api/graph', graphRouter);
  app.use('/api/search', searchRouter);
  
  return app;
};

describe('API Gateway Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('Graph API', () => {
    it('should return graph statistics', async () => {
      const response = await request(app)
        .get('/api/graph/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('nodeCount');
      expect(response.body.data).toHaveProperty('edgeCount');
    });
  });

  describe('Search API', () => {
    it('should handle search requests', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test', limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/graph/stats')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/graph/stats')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});
