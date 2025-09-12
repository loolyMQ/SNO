import { Router } from 'express';
import { ApiResponse, SearchRequest, SearchResponse, GraphData } from '@science-map/shared';

const router = Router();

// История поиска (в памяти для простоты)
const searchHistory: Array<{ query: string; timestamp: number; results: number }> = [];

// Тестовые данные для поиска
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

// Поиск
router.post('/', (req, res) => {
  try {
    const searchRequest: SearchRequest = req.body;
    
    // Валидация запроса
    if (!searchRequest.query || typeof searchRequest.query !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Поле query обязательно и должно быть строкой',
        timestamp: Date.now(),
      };
      return res.status(400).json(response);
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

    // Сохраняем в историю
    searchHistory.push({
      query: searchRequest.query,
      timestamp: Date.now(),
      results: allRelatedNodes.length,
    });

    // Ограничиваем историю 100 записями
    if (searchHistory.length > 100) {
      searchHistory.shift();
    }

    const searchResponse: SearchResponse = {
      results: searchResults,
      total: allRelatedNodes.length,
      query: searchRequest.query,
      executionTime,
    };

    const response: ApiResponse<SearchResponse> = {
      success: true,
      data: searchResponse,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Search error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Ошибка поиска',
      timestamp: Date.now(),
    };
    
    res.status(500).json(response);
  }
});

// Получение истории поиска
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const recentHistory = searchHistory
      .slice(-limit)
      .reverse();

    const response: ApiResponse = {
      success: true,
      data: {
        history: recentHistory,
        total: searchHistory.length,
      },
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('History error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Ошибка получения истории поиска',
      timestamp: Date.now(),
    };
    
    res.status(500).json(response);
  }
});

// Получение всех данных (для тестирования)
router.get('/all', (req, res) => {
  try {
    const response: ApiResponse<GraphData> = {
      success: true,
      data: mockData,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('All data error:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Ошибка получения данных',
      timestamp: Date.now(),
    };
    
    res.status(500).json(response);
  }
});

export { router as searchRoutes };
