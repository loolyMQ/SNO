import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

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
    const response = await axios.post('http://localhost:3001/api/search', req.body);
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

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 API Gateway запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
