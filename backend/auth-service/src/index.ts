import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Logger, createKafkaClient, defaultKafkaConfig } from '@platform/shared';
import { createMonitoring, MetricsServer } from '@platform/monitoring';

const app = express();
const port = process.env['PORT'] || 3002;
const metricsPort = 9092;

// Инициализация логгера
const logger = new Logger({
  service: 'auth-service',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация мониторинга
const monitoring = createMonitoring({
  serviceName: 'auth-service',
  serviceVersion: '0.1.0',
  environment: process.env['NODE_ENV'] || 'development',
});

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient({
  ...defaultKafkaConfig,
  clientId: 'auth-service',
}, logger);

// Middleware
app.use(express.json());

// Мониторинг middleware
app.use(monitoring.middleware.express);

// Схемы валидации
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Временное хранилище пользователей (в реальном проекте будет база данных)
const users = new Map<string, {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}>();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await monitoring.health.checkAll();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      version: '0.1.0',
      dependencies: healthStatus,
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password, name } = validatedData;

    // Проверяем, существует ли пользователь
    if (users.has(email)) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'User with this email already exists',
      });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создаем пользователя
    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
    };

    users.set(email, user);

    // Отправляем событие в Kafka
    await kafkaClient.sendMessage({
      topic: 'user-events',
      key: userId,
      value: {
        event: 'user.created',
        data: {
          id: userId,
          email,
          name,
          createdAt: user.createdAt,
        },
        timestamp: new Date().toISOString(),
        source: 'auth-service',
      },
      headers: {
        'content-type': 'application/json',
        'source': 'auth-service',
      },
    });

    logger.info('User registered successfully', {
      userId,
      email,
      name,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: userId,
        email,
        name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Registration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Находим пользователя
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password',
      });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name,
      },
      process.env['JWT_SECRET'] || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Отправляем событие в Kafka
    await kafkaClient.sendMessage({
      topic: 'user-events',
      key: user.id,
      value: {
        event: 'user.logged_in',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          loginAt: new Date(),
        },
        timestamp: new Date().toISOString(),
        source: 'auth-service',
      },
      headers: {
        'content-type': 'application/json',
        'source': 'auth-service',
      },
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Login failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Верификация токена
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authorization token is required',
      });
    }

    const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'your-secret-key') as any;
    
    res.status(200).json({
      success: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      },
    });
  } catch (error) {
    logger.error('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(401).json({
      error: 'Invalid token',
      message: 'Token verification failed',
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await kafkaClient.disconnect();
    await monitoring.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await kafkaClient.disconnect();
    await monitoring.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Подключаемся к Kafka
    await kafkaClient.connect();
    logger.info('Connected to Kafka');

    // Создаем топик для событий пользователей
    await kafkaClient.createTopic('user-events', 3, 1);
    logger.info('Created user-events topic');

    // Запускаем сервер метрик
    const metricsServer = new MetricsServer(metricsPort);
    await metricsServer.start();
    logger.info(`Metrics server started on port ${metricsPort}`);

    // Запускаем основной сервер
    app.listen(port, () => {
      logger.info(`Auth service server started on port ${port}`, {
        port,
        metricsPort,
        environment: process.env['NODE_ENV'] || 'development',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

startServer();
