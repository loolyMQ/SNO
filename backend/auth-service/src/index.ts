import express from 'express';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const SERVICE_NAME = 'auth-service';
const PORT = parseInt(process.env['PORT'] || '3002', 10);
const METRICS_PORT = parseInt(process.env['METRICS_PORT'] || '9092', 10);
const JWT_SECRET = process.env['JWT_SECRET'] || 'supersecretjwtkey';

const logger = new Logger({
  service: SERVICE_NAME,
  environment: (process.env['NODE_ENV'] as 'development' | 'staging' | 'production') || 'development',
} as any);

const monitoring = createMonitoring({
  serviceName: SERVICE_NAME,
  serviceVersion: '1.0.0',
  environment: (process.env['NODE_ENV'] as 'development' | 'staging' | 'production') || 'development',
  metrics: {
    enabled: true,
    port: METRICS_PORT,
    endpoint: '/metrics',
    collectDefaultMetrics: true,
  },
  tracing: {
    enabled: true,
    exporter: 'console',
  },
  instrumentation: {
    http: true,
    express: true,
    fs: false,
    dns: false,
    net: false,
    pg: false,
    redis: false,
  },
});
const metricsServer = new MetricsServer(monitoring, METRICS_PORT);

const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: `${SERVICE_NAME}-client`,
  brokers: [process.env['KAFKA_BROKER_URL'] || 'localhost:9092'],
}, logger);

// Mock database
const users: any[] = [];

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

async function bootstrap() {
  const app = express();
  app.use(express.json());
  // Middleware для метрик будет добавлен позже

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await monitoring.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // Register endpoint
  app.post('/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const user = {
        id: Date.now().toString(),
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      };
      
      users.push(user);
      
      // Publish user created event
      await kafkaClient.sendMessage({
        topic: 'user-events',
        key: user.id,
        value: {
          eventType: 'user.created',
          userId: user.id,
          email: user.email,
          name: user.name,
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('User registered successfully', { 
        service: SERVICE_NAME,
        userId: user.id,
        email: user.email 
      } as any);
      
      res.status(201).json({ 
        message: 'User registered successfully',
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      logger.error('Registration failed', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const user = users.find(u => u.email === validatedData.email);
      
      if (!user || !await bcrypt.compare(validatedData.password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Publish user login event
      await kafkaClient.sendMessage({
        topic: 'user-events',
        key: user.id,
        value: {
          eventType: 'user.login',
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      });
      
      logger.info('User logged in successfully', { 
        service: SERVICE_NAME,
        userId: user.id,
        email: user.email 
      } as any);
      
      return res.json({ 
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      logger.error('Login failed', { 
        service: SERVICE_NAME,
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any);
      return res.status(400).json({ error: 'Login failed' });
    }
  });

  // Start the server
  const server = app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} listening on port ${PORT}`, {
      service: SERVICE_NAME,
      port: PORT,
      metricsPort: METRICS_PORT,
      environment: process.env['NODE_ENV'] || 'development',
    } as any);
    monitoring['tracingManager'].start();
    metricsServer.start();
    kafkaClient.connect().then(() => logger.info('Kafka producer connected.')).catch(err => logger.error('Failed to connect Kafka producer', { 
      service: SERVICE_NAME,
      error: err.message 
    } as any));
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...', { service: SERVICE_NAME } as any);
    await kafkaClient.disconnect();
    metricsServer.stop();
    server.close(() => {
      logger.info('Server closed.', { service: SERVICE_NAME } as any);
      process.exit(0);
    });
  });
}

bootstrap().catch(err => {
  logger.fatal('Failed to bootstrap Auth Service', { 
    service: SERVICE_NAME,
    error: err.message, 
    stack: err.stack 
  } as any);
  process.exit(1);
});