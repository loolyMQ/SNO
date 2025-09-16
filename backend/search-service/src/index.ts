import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createKafkaClient, ServiceConfig } from '@science-map/shared';
import { searchRoutes } from './routes/search';
import { healthRoutes } from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

// Конфигурация сервиса
const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'search-service',
    groupId: 'search-service-group',
  },
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Инициализация Kafka клиента
const kafkaClient = createKafkaClient(config);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/search', searchRoutes);

// Главная страница
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Search Service',
      version: '1.0.0',
      status: 'running',
      endpoints: ['GET /api/health', 'POST /api/search', 'GET /api/search/history'],
    },
    timestamp: Date.now(),
  });
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Search Service Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message,
    timestamp: Date.now(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Эндпоинт не найден',
    timestamp: Date.now(),
  });
});

// Запуск сервера
async function startServer() {
  try {
    await kafkaClient.connect();
    console.log('✅ Kafka клиент подключен');

    // Подписка на события поиска
    await kafkaClient.subscribeToTopic('search-queries', async (event) => {
      console.log('🔍 Получено событие поиска:', event.type);
      // Здесь можно добавить логику обработки событий
    });

    app.listen(PORT, () => {
      console.log(`🚀 Search Service запущен на порту ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска Search Service:', error);
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
