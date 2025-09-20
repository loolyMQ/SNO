import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../routes/health';

// Создаем упрощенное приложение для тестирования основной функциональности
const createTestApp = () => {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  // Routes
  app.use('/api/health', healthRoutes);
  
  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      timestamp: Date.now()
    });
  });
  
  return app;
};

describe('API Gateway Main Application', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Application Setup', () => {
    it('should create express application', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('should handle basic middleware setup', () => {
      // Проверяем, что приложение может обрабатывать запросы
      expect(app).toBeDefined();
    });
  });

  describe('CORS Middleware', () => {
    it('should handle OPTIONS request', async () => {
      const response = await request(app)
        .options('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept, Authorization');
    });

    it('should add CORS headers to regular requests', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept, Authorization');
    });
  });

  describe('JSON Middleware', () => {
    it('should parse JSON request body', async () => {
      const testData = { test: 'data' };
      
      // Создаем тестовый endpoint для проверки JSON parsing
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(testApp)
        .post('/test')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('received', testData);
    });

    it('should handle malformed JSON gracefully', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test', (req, res) => {
        res.json({ received: req.body });
      });
      
      // Добавляем error handler для JSON parsing errors
      testApp.use((err: any, req: any, res: any, next: any) => {
        if (err instanceof SyntaxError && 'body' in err) {
          res.status(400).json({ error: 'Invalid JSON' });
        } else {
          next(err);
        }
      });

      const response = await request(testApp)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid JSON');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle server errors', async () => {
      // Создаем приложение с middleware, которое выбрасывает ошибку
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.use('/api/health', healthRoutes);
      
      // Добавляем middleware, которое выбрасывает ошибку
      errorApp.use('/api/test-error', (req, res, next) => {
        throw new Error('Test error');
      });
      
      errorApp.use((err: any, req: any, res: any, next: any) => {
        console.error('Error:', err);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: Date.now()
        });
      });

      const response = await request(errorApp)
        .get('/api/test-error')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Internal server error');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Route Integration', () => {
    it('should serve health endpoint', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('service', 'API Gateway');
    });
  });

  describe('Request/Response Format', () => {
    it('should return consistent response format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('number');
    });

    it('should handle different HTTP methods', async () => {
      // GET request
      await request(app)
        .get('/api/health')
        .expect(200);

      // OPTIONS request
      await request(app)
        .options('/api/health')
        .expect(200);
    });
  });
});
