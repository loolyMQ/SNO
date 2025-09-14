import express from 'express';
import cors from 'cors';
import { KafkaClient } from '../../../shared/src/kafka/client';

const app = express();
const PORT = process.env.PORT || 3003;

// Kafka клиент
const kafkaClient = new KafkaClient({
  kafka: {
    clientId: 'search-service',
    brokers: ['localhost:9092'],
    groupId: 'search-service-group'
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Простые типы
interface SearchResult {
  id: string;
  title: string;
  type: 'paper' | 'author' | 'institution';
  relevance: number;
  metadata: any;
}

// Моковые данные для поиска
const searchData: SearchResult[] = [
  {
    id: '1',
    title: 'Machine Learning in Scientific Research',
    type: 'paper',
    relevance: 0.95,
    metadata: { year: 2023, citations: 150 }
  },
  {
    id: '2',
    title: 'Dr. John Smith',
    type: 'author',
    relevance: 0.88,
    metadata: { institution: 'MIT', papers: 45 }
  },
  {
    id: '3',
    title: 'Stanford University',
    type: 'institution',
    relevance: 0.92,
    metadata: { country: 'USA', researchers: 2000 }
  }
];

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Search Service',
      status: 'healthy',
      timestamp: Date.now(),
    },
  });
});

app.post('/api/search', (req, res) => {
  const { query, filters } = req.body;
  
  // Простой поиск по заголовкам
  const results = searchData.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  
  // Публикуем событие поиска
  setImmediate(async () => {
    try {
      await kafkaClient.publishEvent('search-events', {
        id: `search-${Date.now()}`,
        type: 'SEARCH_QUERY',
        data: {
          query,
          resultsCount: results.length,
          filters
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Ошибка публикации события поиска:', error);
    }
  });
  
  res.json({
    success: true,
    data: {
      results,
      total: results.length,
      query,
      executionTime: Math.random() * 100
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

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🚀 Search Service запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  await initializeKafka();
});