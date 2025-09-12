import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createKafkaClient, ServiceConfig, GraphPhysics, PhysicsConfig } from '@science-map/shared';
import { graphRoutes } from './routes/graph';
import { healthRoutes } from './routes/health';
import { GraphService } from './services/GraphService';

const app = express();
const PORT = process.env.PORT || 3002;

// Конфигурация сервиса
const config: ServiceConfig = {
  port: Number(PORT),
  kafka: {
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    clientId: 'graph-service',
    groupId: 'graph-service-group',
  },
};

// Конфигурация физики
const physicsConfig: PhysicsConfig = {
  repulsion: 200,
  attraction: 0.1,
  gravity: 0.01,
  damping: 0.9,
  naturalLinkLength: 100,
  maxLinkStretch: 200,
  minLinkLength: 50,
  springStiffness: 0.1,
  springDamping: 0.8,
  initialTemperature: 1000,
  minTemperature: 0.1,
  coolingRate: 0.95,
  adaptiveFPS: true,
  targetFPS: 60,
  maxFPS: 120,
  minFPS: 30,
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Инициализация сервисов
const kafkaClient = createKafkaClient(config);
const graphService = new GraphService(physicsConfig);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/graph', graphRoutes(graphService));

// Главная страница
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Graph Service',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        'GET /api/health',
        'GET /api/graph',
        'POST /api/graph/update',
        'GET /api/graph/stats',
      ],
    },
    timestamp: Date.now(),
  });
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Graph Service Error:', err);
  
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
    
    // Подписка на события обновления графа
    await kafkaClient.subscribeToTopic('graph-updates', async (event) => {
      console.log('📊 Получено событие обновления графа:', event.type);
      // Здесь можно добавить логику обработки событий
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Graph Service запущен на порту ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска Graph Service:', error);
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