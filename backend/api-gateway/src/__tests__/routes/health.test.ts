import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../../routes/health';

// Создаем тестовое приложение
const app = express();
app.use('/api/health', healthRoutes);

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('service', 'API Gateway');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('version', '1.0.0');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
    });

    it('should return memory information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.memory).toHaveProperty('rss');
      expect(response.body.data.memory).toHaveProperty('heapTotal');
      expect(response.body.data.memory).toHaveProperty('heapUsed');
      expect(response.body.data.memory).toHaveProperty('external');
      expect(response.body.data.memory).toHaveProperty('arrayBuffers');
      
      // Проверяем, что все значения памяти - числа
      expect(typeof response.body.data.memory.rss).toBe('number');
      expect(typeof response.body.data.memory.heapTotal).toBe('number');
      expect(typeof response.body.data.memory.heapUsed).toBe('number');
      expect(typeof response.body.data.memory.external).toBe('number');
      expect(typeof response.body.data.memory.arrayBuffers).toBe('number');
    });

    it('should return uptime as number', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(typeof response.body.data.uptime).toBe('number');
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });

    it('should return timestamp as number', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(typeof response.body.data.timestamp).toBe('number');
      expect(response.body.data.timestamp).toBeGreaterThan(0);
    });
  });
});
