import request from 'supertest';
import express from 'express';
import { searchRoutes } from '../../routes/search';

// Мокаем axios
jest.mock('axios');
import axios from 'axios';

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/search', searchRoutes);

describe('Search Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/search', () => {
    it('should handle search request successfully', async () => {
      const searchRequest = { query: 'test query' };
      const mockResponse = {
        data: {
          results: [
            { id: '1', title: 'Test Result 1', relevance: 0.95 },
            { id: '2', title: 'Test Result 2', relevance: 0.87 }
          ],
          total: 2,
          query: 'test query'
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/search')
        .send(searchRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('total', 2);
      expect(response.body.data).toHaveProperty('query', 'test query');
      expect(response.body.data.results).toHaveLength(2);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/search',
        searchRequest,
        { timeout: 10000 }
      );
    });

    it('should handle search service errors', async () => {
      const searchRequest = { query: 'test query' };
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Search service error' }
        }
      };

      axios.post.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/search')
        .send(searchRequest)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Search service error');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle network errors', async () => {
      const searchRequest = { query: 'test query' };
      const mockError = new Error('Network error');

      axios.post.mockRejectedValue(mockError);

      const response = await request(app)
        .post('/api/search')
        .send(searchRequest)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка поиска');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/search/history', () => {
    it('should return search history successfully', async () => {
      const mockResponse = {
        data: {
          history: [
            { query: 'test query 1', timestamp: Date.now() - 1000 },
            { query: 'test query 2', timestamp: Date.now() - 2000 }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/search/history')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data.history).toHaveLength(2);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/search/history',
        { timeout: 5000 }
      );
    });

    it('should handle history service errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'History service error' }
        }
      };

      axios.get.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/search/history')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка получения истории поиска');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle network errors for history', async () => {
      const mockError = new Error('Network error');

      axios.get.mockRejectedValue(mockError);

      const response = await request(app)
        .get('/api/search/history')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Ошибка получения истории поиска');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
