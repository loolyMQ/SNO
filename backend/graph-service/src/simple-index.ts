import express from 'express';
import cors from 'cors';

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

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Graph Service запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
