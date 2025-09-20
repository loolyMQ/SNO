import request from 'supertest';
import express from 'express';
import { graphRoutes } from '../../routes/graph';

// Мокаем axios
jest.mock('axios');
import axios from 'axios';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/graph', graphRoutes);

describe('Graph Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/graph', () => {
    it('should get graph data successfully', async () => {
      const mockResponse = {
        data: {
          nodes: [
            { id: '1', label: 'Node 1', x: 100, y: 100 },
            { id: '2', label: 'Node 2', x: 200, y: 200 }
          ],
          edges: [
            { id: '1', source: '1', target: '2', weight: 0.8 }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/graph')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
      expect(response.body.data.nodes).toHaveLength(2);
      expect(response.body.data.edges).toHaveLength(1);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3002/api/graph',
        { timeout: 10000 }
      );
    });

    it('should handle graph service errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Graph service error' }
        }
      };

      axios.get.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/graph')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Graph service error');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');

      axios.get.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/graph')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка получения данных графа');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/graph/update', () => {
    it('should update graph data successfully', async () => {
      const graphData = {
        nodes: [
          { id: '1', label: 'Updated Node 1', x: 150, y: 150 },
          { id: '2', label: 'Updated Node 2', x: 250, y: 250 }
        ],
        edges: [
          { id: '1', source: '1', target: '2', weight: 0.9 }
        ]
      };

      const mockResponse = {
        data: { success: true, message: 'Graph updated successfully' }
      };

      axios.post.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/graph/update')
        .send(graphData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message', 'Graph updated successfully');

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3002/api/graph/update',
        graphData,
        { timeout: 15000 }
      );
    });

    it('should validate nodes field', async () => {
      const invalidGraphData = {
        nodes: 'invalid', // Должно быть массивом
        edges: []
      };

      const response = await request(app)
        .post('/api/graph/update')
        .send(invalidGraphData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Поле nodes обязательно и должно быть массивом');
      expect(response.body).toHaveProperty('timestamp');

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should validate edges field', async () => {
      const invalidGraphData = {
        nodes: [],
        edges: null // Должно быть массивом
      };

      const response = await request(app)
        .post('/api/graph/update')
        .send(invalidGraphData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Поле edges обязательно и должно быть массивом');
      expect(response.body).toHaveProperty('timestamp');

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle graph service errors', async () => {
      const graphData = {
        nodes: [{ id: '1', label: 'Node 1', x: 100, y: 100 }],
        edges: []
      };

      const mockError = {
        response: {
          status: 500,
          data: { error: 'Graph service error' }
        }
      };

      axios.post.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/graph/update')
        .send(graphData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Graph service error');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle network errors', async () => {
      const graphData = {
        nodes: [{ id: '1', label: 'Node 1', x: 100, y: 100 }],
        edges: []
      };

      const mockError = new Error('Network error');

      axios.post.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/graph/update')
        .send(graphData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка обновления данных графа');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/graph/stats', () => {
    it('should get graph statistics successfully', async () => {
      const mockResponse = {
        data: {
          nodeCount: 5,
          edgeCount: 3,
          averageConnections: 1.2
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/graph/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('nodeCount', 5);
      expect(response.body.data).toHaveProperty('edgeCount', 3);
      expect(response.body.data).toHaveProperty('averageConnections', 1.2);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3002/api/graph/stats',
        { timeout: 5000 }
      );
    });

    it('should handle stats service errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Stats service error' }
        }
      };

      axios.get.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/graph/stats')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка получения статистики графа');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle network errors for stats', async () => {
      const mockError = new Error('Network error');

      axios.get.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/graph/stats')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка получения статистики графа');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});

