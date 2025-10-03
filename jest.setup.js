// Jest setup file
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'file:./test.db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-secret';

// Fix Zod compatibility with Jest
const { z } = require('zod');
global.z = z;

// Mock external services
jest.mock('@science-map/shared', () => ({
  createKafkaClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Global test timeout
jest.setTimeout(10000);
