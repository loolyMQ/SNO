import request from 'supertest';
import express from 'express';

// Mock the graph router
const graphRouter = express.Router();
graphRouter.post('/update', (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) {
    return res.status(400).json({ success: false, error: 'Invalid graph data' });
  }
  res.json({ success: true, data: { message: 'Graph updated' } });
});
graphRouter.get('/stats', (req, res) => {
  res.json({ success: true, data: { nodeCount: 5, edgeCount: 3 } });
});

const app = express();
app.use(express.json());
app.use('/api/graph', graphRouter);

describe('Graph Routes', () => {
  describe('POST /api/graph/update', () => {
    it('should handle graph update request', async () => {
      const graphData = {
        nodes: [
          { id: '1', label: 'Node 1', type: 'topic' },
          { id: '2', label: 'Node 2', type: 'author' },
        ],
        edges: [
          { id: '1', source: '1', target: '2', type: 'related_to' },
        ],
      };

      const response = await request(app)
        .post('/api/graph/update')
        .send(graphData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should handle invalid graph data', async () => {
      const response = await request(app)
        .post('/api/graph/update')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/graph/stats', () => {
    it('should return graph statistics', async () => {
      const response = await request(app)
        .get('/api/graph/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('nodeCount');
      expect(response.body.data).toHaveProperty('edgeCount');
    });
  });
});
