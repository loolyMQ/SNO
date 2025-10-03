import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  }));
});

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed-${password}`)),
  compare: jest.fn((password: string, hash: string) => {
    return Promise.resolve(hash === `hashed-${password}`);
  }),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(),
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth routes
  app.post('/auth/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, passwordHash: passwordHash } });
      res.status(201).json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ sub: user.id, email: user.email }, 'test-secret', { expiresIn: '15m' });
      res.json({ success: true, token: token, user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  });

  return app;
};

describe('Auth Service', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock successful user creation
      const mockUser = {
        id: '1',
        email: userData.email,
        passwordHash: 'hashed-password123'
      };
      
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          passwordHash: expect.any(String)
        })
      });
    });

    it('should handle registration errors', async () => {
      // Mock Prisma to throw error
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Registration failed');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password'
      };

      // Mock user lookup with correct password hash format
      const mockUser = {
        id: '1',
        email: loginData.email,
        passwordHash: 'hashed-password'
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
