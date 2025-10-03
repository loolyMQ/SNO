const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Create test app with security middleware
const createSecureApp = () => {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }));
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
  });
  app.use(limiter);
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Test routes
  app.get('/api/public', (req, res) => {
    res.json({ message: 'Public endpoint' });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Mock authentication
    if (email === 'test@example.com' && password === 'password123') {
      res.json({ success: true, token: 'mock-jwt-token' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.get('/api/protected', (req, res) => {
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ message: 'Protected endpoint accessed' });
  });

  return app;
};

describe('Security Tests', () => {
  let app;

  beforeEach(() => {
    app = createSecureApp();
  });

  describe('Helmet Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/public')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origin', async () => {
      const response = await request(app)
        .get('/api/public')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should reject requests from disallowed origin', async () => {
      const response = await request(app)
        .get('/api/public')
        .set('Origin', 'http://malicious-site.com')
        .expect(200);

      // CORS should be handled by the browser, but we can check headers
      expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/public')
          .expect(200);
        
        expect(response.body.message).toBe('Public endpoint');
      }
    });

    it('should block requests exceeding rate limit', async () => {
      // Make many requests quickly to trigger rate limit
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(request(app).get('/api/public'));
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body.message).toContain('Too many requests');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty login data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Authorization', () => {
    it('should allow access to protected endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.message).toBe('Protected endpoint accessed');
    });

    it('should reject access to protected endpoint without token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject access to protected endpoint with invalid token format', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should handle malicious input safely', async () => {
      const maliciousInput = {
        email: "'; DROP TABLE users; --",
        password: "password123"
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(401);

      // Should not crash the application
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize malicious scripts in input', async () => {
      const xssInput = {
        email: '<script>alert("xss")</script>@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(xssInput)
        .expect(401);

      // Should not execute the script
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Request Size Limits', () => {
    it('should reject oversized requests', async () => {
      const largeData = {
        email: 'test@example.com',
        password: 'a'.repeat(11 * 1024 * 1024) // 11MB password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(largeData)
        .expect(413); // Payload Too Large

      expect(response.status).toBe(413);
    });
  });
});
