import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { KafkaClient } from '../../../shared/src/kafka/client';

const app = express();
const PORT = process.env.PORT || 3000;

// Kafka клиент
const kafkaClient = new KafkaClient({
  port: 3000,
  kafka: {
    clientId: 'api-gateway',
    brokers: ['localhost:9092'],
    groupId: 'api-gateway-group',
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Проксирование запросов
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'API Gateway',
      status: 'healthy',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  });
});

// Проксирование к Graph Service
app.get('/api/graph', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/api/graph');
    res.json(response.data);
  } catch (error: any) {
    console.error('Graph service error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения данных графа',
      timestamp: Date.now(),
    });
  }
});

app.get('/api/graph/stats', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/api/graph/stats');
    res.json(response.data);
  } catch (error: any) {
    console.error('Graph stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики графа',
      timestamp: Date.now(),
    });
  }
});

app.post('/api/graph/update', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:3002/api/graph/update', req.body);
    res.json(response.data);
  } catch (error: any) {
    console.error('Graph update error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления данных графа',
      timestamp: Date.now(),
    });
  }
});

app.post('/api/graph/simulation/start', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:3002/api/graph/simulation/start');
    res.json(response.data);
  } catch (error: any) {
    console.error('Simulation start error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка запуска симуляции',
      timestamp: Date.now(),
    });
  }
});

app.post('/api/graph/simulation/stop', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:3002/api/graph/simulation/stop');
    res.json(response.data);
  } catch (error: any) {
    console.error('Simulation stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка остановки симуляции',
      timestamp: Date.now(),
    });
  }
});

app.post('/api/graph/physics/reset', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:3002/api/graph/physics/reset');
    res.json(response.data);
  } catch (error: any) {
    console.error('Physics reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сброса физики',
      timestamp: Date.now(),
    });
  }
});

// Проксирование к Search Service
app.post('/api/search', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:3003/api/search', req.body);
    res.json(response.data);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка поиска',
      timestamp: Date.now(),
    });
  }
});

// Проксирование к Graph Service для категорий
app.get('/api/categories', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:3002/api/categories');
    res.json(response.data);
  } catch (error: any) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения категорий',
      timestamp: Date.now(),
    });
  }
});

app.get('/api/categories/:categoryId/topics', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const response = await axios.get(`http://localhost:3002/api/categories/${categoryId}/topics`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Category topics error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения тем категории',
      timestamp: Date.now(),
    });
  }
});

app.get('/api/topics/:topicId/connections', async (req, res) => {
  try {
    const { topicId } = req.params;
    const response = await axios.get(`http://localhost:3002/api/topics/${topicId}/connections`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Topic connections error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения связей темы',
      timestamp: Date.now(),
    });
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'API Gateway',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        'GET /api/health',
        'GET /api/graph',
        'POST /api/graph/update',
        'GET /api/graph/stats',
        'POST /api/search',
      ],
    },
    timestamp: Date.now(),
  });
});

// Инициализация Kafka
async function initializeKafka() {
  try {
    await kafkaClient.connect();
    console.log('✅ Kafka клиент подключен');
  } catch (error) {
    console.error('❌ Ошибка подключения к Kafka:', error);
  }
}

// Middleware для публикации событий API
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    // Публикуем событие о запросе
    setImmediate(async () => {
      try {
        await kafkaClient.publishEvent('api-requests', {
          id: `api-request-${Date.now()}-${Math.random()}`,
          type: 'API_REQUEST',
          source: 'api-gateway',
          data: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Ошибка публикации API события:', error);
      }
    });
    return originalSend.call(this, data);
  };
  next();
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 API Gateway запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  await initializeKafka();
});
