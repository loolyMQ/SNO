import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { ApiResponse, SearchRequest, SearchResponse } from '@science-map/shared';

const router: Router = Router();

// Проксирование запросов к search-service
router.post('/', async (req, res) => {
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

    // Отправка запроса в search-service
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3001';
    const searchResponse = await axios.post(`${searchServiceUrl}/api/search`, searchRequest, {
      timeout: 10000,
    });

    const response: ApiResponse<SearchResponse> = {
      success: true,
      data: searchResponse.data,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Search error:', error);

    const response: ApiResponse = {
      success: false,
      error: error.response?.data?.error || 'Ошибка поиска',
      timestamp: Date.now(),
    };

    res.status(error.response?.status || 500).json(response);
    return;
  }
});

// Получение истории поиска
router.get('/history', async (req, res) => {
  try {
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3001';
    const historyResponse = await axios.get(`${searchServiceUrl}/api/search/history`, {
      timeout: 5000,
    });

    const response: ApiResponse = {
      success: true,
      data: historyResponse.data,
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
    return;
  }
});

export { router as searchRoutes };
