import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

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

interface SearchRequest {
  query: string;
  limit?: number;
}

interface SearchResponse {
  results: GraphData;
  total: number;
  query: string;
  executionTime: number;
}

// Тестовые данные
const mockData: GraphData = {
  nodes: [
    { id: '1', label: 'Машинное обучение', type: 'topic' },
    { id: '2', label: 'Нейронные сети', type: 'topic' },
    { id: '3', label: 'Глубокое обучение', type: 'topic' },
    { id: '4', label: 'Иван Петров', type: 'author' },
    { id: '5', label: 'Мария Сидорова', type: 'author' },
    { id: '6', label: 'МГУ', type: 'institution' },
    { id: '7', label: 'Исследование ИИ', type: 'paper' },
    { id: '8', label: 'Компьютерное зрение', type: 'topic' },
    { id: '9', label: 'Обработка естественного языка', type: 'topic' },
    { id: '10', label: 'Алексей Козлов', type: 'author' },
  ],
  edges: [
    { id: 'e1', source: '1', target: '2', type: 'related_to', weight: 0.8 },
    { id: 'e2', source: '1', target: '3', type: 'related_to', weight: 0.9 },
    { id: 'e3', source: '2', target: '3', type: 'related_to', weight: 0.7 },
    { id: 'e4', source: '4', target: '1', type: 'authored_by', weight: 0.6 },
    { id: 'e5', source: '5', target: '2', type: 'authored_by', weight: 0.8 },
    { id: 'e6', source: '4', target: '6', type: 'belongs_to', weight: 1.0 },
    { id: 'e7', source: '7', target: '1', type: 'cites', weight: 0.9 },
    { id: 'e8', source: '8', target: '1', type: 'related_to', weight: 0.7 },
    { id: 'e9', source: '9', target: '1', type: 'related_to', weight: 0.6 },
    { id: 'e10', source: '10', target: '8', type: 'authored_by', weight: 0.8 },
  ],
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Search Service',
      status: 'healthy',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  });
});

app.post('/api/search', (req, res) => {
  try {
    const searchRequest: SearchRequest = req.body;
    
    if (!searchRequest.query || typeof searchRequest.query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Поле query обязательно и должно быть строкой',
        timestamp: Date.now(),
      });
    }

    const startTime = Date.now();
    
    // Простой поиск по меткам узлов
    const query = searchRequest.query.toLowerCase();
    const filteredNodes = mockData.nodes.filter(node => 
      node.label.toLowerCase().includes(query)
    );

    // Находим связанные узлы
    const relatedNodeIds = new Set(filteredNodes.map(node => node.id));
    const relatedEdges = mockData.edges.filter(edge => 
      relatedNodeIds.has(edge.source) || relatedNodeIds.has(edge.target)
    );

    // Добавляем связанные узлы
    relatedEdges.forEach(edge => {
      relatedNodeIds.add(edge.source);
      relatedNodeIds.add(edge.target);
    });

    const allRelatedNodes = mockData.nodes.filter(node => 
      relatedNodeIds.has(node.id)
    );

    const searchResults: GraphData = {
      nodes: allRelatedNodes,
      edges: relatedEdges,
    };

    const executionTime = Date.now() - startTime;

    const searchResponse: SearchResponse = {
      results: searchResults,
      total: allRelatedNodes.length,
      query: searchRequest.query,
      executionTime,
    };

    res.json({
      success: true,
      data: searchResponse,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка поиска',
      timestamp: Date.now(),
    });
  }
});

app.get('/api/search/all', (req, res) => {
  res.json({
    success: true,
    data: mockData,
    timestamp: Date.now(),
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Search Service',
      version: '1.0.0',
      status: 'running',
      endpoints: [
        'GET /api/health',
        'POST /api/search',
        'GET /api/search/all',
      ],
    },
    timestamp: Date.now(),
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Search Service запущен на порту ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
