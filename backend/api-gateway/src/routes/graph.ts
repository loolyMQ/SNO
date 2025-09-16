import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { ApiResponse, GraphData } from '@science-map/shared';

const router: Router = Router();

// Получение данных графа
router.get('/', async (req, res) => {
  try {
    const graphServiceUrl = process.env.GRAPH_SERVICE_URL || 'http://localhost:3002';
    const graphResponse = await axios.get(`${graphServiceUrl}/api/graph`, {
      timeout: 10000,
    });

    const response: ApiResponse<GraphData> = {
      success: true,
      data: graphResponse.data,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Graph error:', error);

    const response: ApiResponse = {
      success: false,
      error: error.response?.data?.error || 'Ошибка получения данных графа',
      timestamp: Date.now(),
    };

    res.status(error.response?.status || 500).json(response);
  }
});

// Обновление данных графа
router.post('/update', async (req, res) => {
  try {
    const graphData: GraphData = req.body;

    // Валидация данных
    if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
      const response: ApiResponse = {
        success: false,
        error: 'Поле nodes обязательно и должно быть массивом',
        timestamp: Date.now(),
      };
      return res.status(400).json(response);
    }

    if (!graphData.edges || !Array.isArray(graphData.edges)) {
      const response: ApiResponse = {
        success: false,
        error: 'Поле edges обязательно и должно быть массивом',
        timestamp: Date.now(),
      };
      return res.status(400).json(response);
    }

    const graphServiceUrl = process.env.GRAPH_SERVICE_URL || 'http://localhost:3002';
    const updateResponse = await axios.post(`${graphServiceUrl}/api/graph/update`, graphData, {
      timeout: 15000,
    });

    const response: ApiResponse = {
      success: true,
      data: updateResponse.data,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Graph update error:', error);

    const response: ApiResponse = {
      success: false,
      error: error.response?.data?.error || 'Ошибка обновления данных графа',
      timestamp: Date.now(),
    };

    res.status(error.response?.status || 500).json(response);
    return;
  }
});

// Получение статистики графа
router.get('/stats', async (req, res) => {
  try {
    const graphServiceUrl = process.env.GRAPH_SERVICE_URL || 'http://localhost:3002';
    const statsResponse = await axios.get(`${graphServiceUrl}/api/graph/stats`, {
      timeout: 5000,
    });

    const response: ApiResponse = {
      success: true,
      data: statsResponse.data,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Graph stats error:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Ошибка получения статистики графа',
      timestamp: Date.now(),
    };

    res.status(500).json(response);
    return;
  }
});

export { router as graphRoutes };
