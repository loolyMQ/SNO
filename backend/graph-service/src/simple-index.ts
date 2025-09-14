import express from 'express';
import cors from 'cors';
import { KafkaClient } from '../../../shared/src/kafka/client';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Простые типы
interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Тестовые данные
const sampleData: GraphData = {
  nodes: [
    { id: '1', label: 'Машинное обучение', type: 'topic', x: 0, y: 0 },
    { id: '2', label: 'Нейронные сети', type: 'topic', x: 100, y: 100 },
    { id: '3', label: 'Глубокое обучение', type: 'topic', x: -100, y: 100 },
    { id: '4', label: 'Иван Петров', type: 'author', x: 0, y: 200 },
    { id: '5', label: 'Мария Сидорова', type: 'author', x: 200, y: 0 },
    { id: '6', label: 'МГУ', type: 'institution', x: -200, y: 0 },
    { id: '7', label: 'Исследование ИИ', type: 'paper', x: 0, y: -200 },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2', type: 'related_to', weight: 0.8 },
    { id: 'e2', source: '1', target: '3', type: 'related_to', weight: 0.9 },
    { id: 'e3', source: '2', target: '3', type: 'related_to', weight: 0.7 },
    { id: 'e4', source: '4', target: '1', type: 'authored_by', weight: 0.6 },
    { id: 'e5', source: '5', target: '2', type: 'authored_by', weight: 0.8 },
    { id: 'e6', source: '4', target: '6', type: 'belongs_to', weight: 1.0 },
    { id: 'e7', source: '7', target: '1', type: 'cites', weight: 0.9 },
  ],
};

let currentData = { ...sampleData };
let temperature = 1000;
let isSimulating = false;

// Kafka клиент
const kafkaClient = new KafkaClient({
  kafka: {
    clientId: 'graph-service',
    brokers: ['localhost:9092'],
    groupId: 'graph-service-group'
  }
});

// Простая физика
function updatePhysics() {
  if (!isSimulating) return;
  
  // Адаптивное охлаждение в зависимости от размера графа
  const adaptiveCoolingRate = Math.max(0.90, 1 - (currentData.nodes.length / 1000));
  temperature = Math.max(0.1, temperature * adaptiveCoolingRate);
  
  // Инициализация случайных позиций если все узлы в (0,0)
  const allAtOrigin = currentData.nodes.every(node => node.x === 0 && node.y === 0);
  if (allAtOrigin) {
    currentData.nodes.forEach(node => {
      node.x = (Math.random() - 0.5) * 400;
      node.y = (Math.random() - 0.5) * 400;
      node.vx = (Math.random() - 0.5) * 2;
      node.vy = (Math.random() - 0.5) * 2;
    });
  }
  
  // Применение сил
  const nodes = currentData.nodes;
  
  // Отталкивание между узлами
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      
      if (nodeA.x !== undefined && nodeA.y !== undefined && 
          nodeB.x !== undefined && nodeB.y !== undefined) {
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const force = 200 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          nodeA.vx = (nodeA.vx || 0) - fx;
          nodeA.vy = (nodeA.vy || 0) - fy;
          nodeB.vx = (nodeB.vx || 0) + fx;
          nodeB.vy = (nodeB.vy || 0) + fy;
        }
      }
    }
  }
  
  // Притяжение по связям
  currentData.edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode && 
        sourceNode.x !== undefined && sourceNode.y !== undefined &&
        targetNode.x !== undefined && targetNode.y !== undefined) {
      
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 100) {
        const force = 0.1 * (dist - 100);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        sourceNode.vx = (sourceNode.vx || 0) + fx;
        sourceNode.vy = (sourceNode.vy || 0) + fy;
        targetNode.vx = (targetNode.vx || 0) - fx;
        targetNode.vy = (targetNode.vy || 0) - fy;
      }
    }
  });
  
  // Обновление позиций
  nodes.forEach(node => {
    if (node.x !== undefined && node.y !== undefined) {
      node.vx = (node.vx || 0) * 0.9; // Демпфирование
      node.vy = (node.vy || 0) * 0.9;
      
      node.x += (node.vx || 0) * (temperature / 1000);
      node.y += (node.vy || 0) * (temperature / 1000);
    }
  });
  
  // Публикуем событие обновления графа в Kafka (асинхронно)
  setImmediate(async () => {
    try {
      await kafkaClient.publishEvent('graph-updates', {
        id: `graph-update-${Date.now()}`,
        type: 'GRAPH_UPDATED',
        data: {
          nodeCount: currentData.nodes.length,
          edgeCount: currentData.edges.length,
          temperature,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Ошибка публикации в Kafka:', error);
    }
  });
}

// Запуск симуляции
setInterval(updatePhysics, 16); // ~60 FPS

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Graph Service',
      status: 'healthy',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  });
});

app.get('/api/graph', (req, res) => {
  res.json({
    success: true,
    data: currentData,
    timestamp: Date.now(),
  });
});

app.get('/api/graph/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      nodeCount: currentData.nodes.length,
      edgeCount: currentData.edges.length,
      temperature: temperature,
      isStable: temperature <= 0.1,
      isSimulating: isSimulating,
    },
    timestamp: Date.now(),
  });
});

app.post('/api/graph/update', (req, res) => {
  try {
    const newData: GraphData = req.body;
    currentData = { ...newData };
    res.json({
      success: true,
      data: { message: 'Данные графа обновлены' },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления данных графа',
      timestamp: Date.now(),
    });
  }
});

app.post('/api/graph/simulation/start', (req, res) => {
  isSimulating = true;
  res.json({
    success: true,
    data: { message: 'Симуляция запущена' },
    timestamp: Date.now(),
  });
});

app.post('/api/graph/simulation/stop', (req, res) => {
  isSimulating = false;
  res.json({
    success: true,
    data: { message: 'Симуляция остановлена' },
    timestamp: Date.now(),
  });
});

app.post('/api/graph/physics/reset', (req, res) => {
  temperature = 1000;
  currentData = { ...sampleData };
  res.json({
    success: true,
    data: { message: 'Физика сброшена' },
    timestamp: Date.now(),
  });
});

// Endpoints для категорий
app.get('/api/categories', (req, res) => {
  const categories = [
    {
      id: 'science-map',
      name: 'Карта науки',
      description: 'Визуализация научных связей и исследований',
      connections: ['lectures', 'category3', 'category4']
    },
    {
      id: 'lectures',
      name: 'Депозитарий лекций',
      description: 'Архив лекций и образовательных материалов',
      connections: ['science-map', 'category3', 'category4']
    },
    {
      id: 'category3',
      name: '',
      description: 'Категория 3',
      connections: ['science-map', 'lectures', 'category4']
    },
    {
      id: 'category4',
      name: '',
      description: 'Категория 4',
      connections: ['science-map', 'lectures', 'category3']
    }
  ];

  res.json({
    success: true,
    data: { categories },
    timestamp: Date.now(),
  });
});

app.get('/api/categories/:categoryId/topics', (req, res) => {
  const { categoryId } = req.params;

  // Моковые данные тем для каждой категории
  const topicsData: { [key: string]: any[] } = {
    'science-map': [
      { id: 'topic1', title: 'Машинное обучение', description: 'Алгоритмы и методы МО' },
      { id: 'topic2', title: 'Нейронные сети', description: 'Архитектуры нейросетей' },
      { id: 'topic3', title: 'Глубокое обучение', description: 'Deep Learning методы' },
      { id: 'topic4', title: 'Искусственный интеллект', description: 'Общие принципы ИИ' },
      { id: 'topic5', title: 'Наука о данных', description: 'Data Science подходы' }
    ],
    'lectures': [
      { id: 'lecture1', title: 'Введение в программирование', description: 'Базовые концепции' },
      { id: 'lecture2', title: 'Алгоритмы и структуры данных', description: 'Основы алгоритмики' },
      { id: 'lecture3', title: 'Базы данных', description: 'SQL и NoSQL' },
      { id: 'lecture4', title: 'Веб-разработка', description: 'Frontend и Backend' },
      { id: 'lecture5', title: 'Мобильная разработка', description: 'iOS и Android' }
    ],
    'category3': [
      { id: 'item1', title: 'Элемент 1', description: 'Описание элемента 1' },
      { id: 'item2', title: 'Элемент 2', description: 'Описание элемента 2' },
      { id: 'item3', title: 'Элемент 3', description: 'Описание элемента 3' }
    ],
    'category4': [
      { id: 'data1', title: 'Данные 1', description: 'Описание данных 1' },
      { id: 'data2', title: 'Данные 2', description: 'Описание данных 2' },
      { id: 'data3', title: 'Данные 3', description: 'Описание данных 3' },
      { id: 'data4', title: 'Данные 4', description: 'Описание данных 4' }
    ]
  };

  const topics = topicsData[categoryId] || [];

  res.json({
    success: true,
    data: { topics },
    timestamp: Date.now(),
  });
});

// Endpoint для получения связей конкретной темы
app.get('/api/topics/:topicId/connections', (req, res) => {
  const { topicId } = req.params;

  // Моковые данные связей для каждой темы
  const connectionsData: { [key: string]: any } = {
    'topic1': {
      topic: { id: 'topic1', title: 'Машинное обучение', description: 'Алгоритмы и методы МО' },
      connections: [
        { id: 'topic2', title: 'Нейронные сети', type: 'related' },
        { id: 'topic3', title: 'Глубокое обучение', type: 'related' },
        { id: 'topic4', title: 'Искусственный интеллект', type: 'parent' }
      ]
    },
    'topic2': {
      topic: { id: 'topic2', title: 'Нейронные сети', description: 'Архитектуры нейросетей' },
      connections: [
        { id: 'topic1', title: 'Машинное обучение', type: 'related' },
        { id: 'topic3', title: 'Глубокое обучение', type: 'parent' },
        { id: 'topic4', title: 'Искусственный интеллект', type: 'parent' }
      ]
    },
    'topic3': {
      topic: { id: 'topic3', title: 'Глубокое обучение', description: 'Deep Learning методы' },
      connections: [
        { id: 'topic1', title: 'Машинное обучение', type: 'related' },
        { id: 'topic2', title: 'Нейронные сети', type: 'child' },
        { id: 'topic4', title: 'Искусственный интеллект', type: 'parent' }
      ]
    },
    'topic4': {
      topic: { id: 'topic4', title: 'Искусственный интеллект', description: 'Общие принципы ИИ' },
      connections: [
        { id: 'topic1', title: 'Машинное обучение', type: 'child' },
        { id: 'topic2', title: 'Нейронные сети', type: 'child' },
        { id: 'topic3', title: 'Глубокое обучение', type: 'child' },
        { id: 'topic5', title: 'Наука о данных', type: 'related' }
      ]
    },
    'topic5': {
      topic: { id: 'topic5', title: 'Наука о данных', description: 'Data Science подходы' },
      connections: [
        { id: 'topic1', title: 'Машинное обучение', type: 'related' },
        { id: 'topic4', title: 'Искусственный интеллект', type: 'related' }
      ]
    },
    'lecture1': {
      topic: { id: 'lecture1', title: 'Введение в программирование', description: 'Базовые концепции' },
      connections: [
        { id: 'lecture2', title: 'Алгоритмы и структуры данных', type: 'next' },
        { id: 'lecture3', title: 'Базы данных', type: 'related' }
      ]
    },
    'lecture2': {
      topic: { id: 'lecture2', title: 'Алгоритмы и структуры данных', description: 'Основы алгоритмики' },
      connections: [
        { id: 'lecture1', title: 'Введение в программирование', type: 'previous' },
        { id: 'lecture3', title: 'Базы данных', type: 'next' },
        { id: 'lecture4', title: 'Веб-разработка', type: 'related' }
      ]
    },
    'lecture3': {
      topic: { id: 'lecture3', title: 'Базы данных', description: 'SQL и NoSQL' },
      connections: [
        { id: 'lecture1', title: 'Введение в программирование', type: 'related' },
        { id: 'lecture2', title: 'Алгоритмы и структуры данных', type: 'previous' },
        { id: 'lecture4', title: 'Веб-разработка', type: 'next' }
      ]
    },
    'lecture4': {
      topic: { id: 'lecture4', title: 'Веб-разработка', description: 'Frontend и Backend' },
      connections: [
        { id: 'lecture2', title: 'Алгоритмы и структуры данных', type: 'related' },
        { id: 'lecture3', title: 'Базы данных', type: 'previous' },
        { id: 'lecture5', title: 'Мобильная разработка', type: 'related' }
      ]
    },
    'lecture5': {
      topic: { id: 'lecture5', title: 'Мобильная разработка', description: 'iOS и Android' },
      connections: [
        { id: 'lecture4', title: 'Веб-разработка', type: 'related' }
      ]
    }
  };

  const topicData = connectionsData[topicId] || {
    topic: { id: topicId, title: `Тема ${topicId}`, description: 'Описание темы' },
    connections: []
  };

  res.json({
    success: true,
    data: topicData,
    timestamp: Date.now(),
  });
});


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
  console.log(`🚀 Graph Service запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  await initializeKafka();
});
