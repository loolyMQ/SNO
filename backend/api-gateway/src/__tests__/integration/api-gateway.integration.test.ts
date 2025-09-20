import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../../routes/health';

// Мокаем axios для внешних сервисов
jest.mock('axios');
// const axios = require('axios');

// Создаем тестовое приложение только с health роутом
const app = express();
app.use(express.json());
app.use('/api/health', healthRoutes);

describe('API Gateway Integration Tests', () => {
  beforeEach(() => {
    // Сбрасываем моки перед каждым тестом
    jest.clearAllMocks();
  });

  describe('Health API Integration', () => {
    it('should handle health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('service', 'API Gateway');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('version');
    });

    it('should handle health check with memory info', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data.memory).toHaveProperty('rss');
      expect(response.body.data.memory).toHaveProperty('heapTotal');
      expect(response.body.data.memory).toHaveProperty('heapUsed');
    });
  });

  describe('API Gateway Service Integration', () => {
    it('should handle multiple health checks', async () => {
      // Выполняем несколько проверок здоровья
      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);

      // Проверяем, что все запросы успешны
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('status', 'healthy');
      });
    });

    it('should handle concurrent health checks', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Проверяем, что все запросы успешны
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });

      // Проверяем, что запросы выполняются быстро (менее 1 секунды)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
