import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createKafkaClient, ServiceConfig, ApiResponse } from '@science-map/shared';
import { searchRoutes } from './routes/search';
import { graphRoutes } from './routes/graph';
import { healthRoutes } from './routes/health';

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация сервиса
const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'api-gateway',
    groupId: 'api-gateway-group',
  },
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов на IP за 15 минут
  message: 'Слишком много запросов с этого IP, попробуйте позже.',
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient(config);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/graph', graphRoutes);

// Главная страница
app.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      service: 'API Gateway',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        'GET /api/health',
        'POST /api/search',
        'GET /api/graph',
        'POST /api/graph/update',
      ],
    },
    timestamp: Date.now(),
  };
  res.json(response);
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Gateway Error:', err);
  
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message,
    timestamp: Date.now(),
  };
  
  res.status(err.status || 500).json(response);
});

// 404 handler
app.use('*', (req, res) => {
  const response: ApiResponse = {
    success: false,
    error: 'Эндпоинт не найден',
    timestamp: Date.now(),
  };
  res.status(404).json(response);
});

// Запуск сервера
async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Kafka клиент подключен');
    
    app.listen(PORT, () => {
      console.log(`🚀 API Gateway запущен на порту ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска API Gateway:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Получен SIGTERM, завершение работы...');
  await kafkaClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Получен SIGINT, завершение работы...');
  await kafkaClient.disconnect();
  process.exit(0);
});

startServer();