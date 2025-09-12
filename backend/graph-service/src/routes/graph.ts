import { Router } from 'express';
import { ApiResponse, GraphData } from '@science-map/shared';
import { GraphService } from '../services/GraphService';

export function graphRoutes(graphService: GraphService): Router {
  const router = Router();

  // Получение данных графа
  router.get('/', (req, res) => {
    try {
      const graphData = graphService.getGraphData();
      
      const response: ApiResponse<GraphData> = {
        success: true,
        data: graphData,
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Graph data error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Ошибка получения данных графа',
        timestamp: Date.now(),
      };
      
      res.status(500).json(response);
    }
  });

  // Обновление данных графа
  router.post('/update', (req, res) => {
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

      graphService.setGraphData(graphData);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Данные графа обновлены' },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Graph update error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Ошибка обновления данных графа',
        timestamp: Date.now(),
      };
      
      res.status(500).json(response);
    }
  });

  // Получение статистики графа
  router.get('/stats', (req, res) => {
    try {
      const stats = graphService.getPhysicsStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats,
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
    }
  });

  // Запуск симуляции
  router.post('/simulation/start', (req, res) => {
    try {
      graphService.startSimulation();
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Симуляция запущена' },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Simulation start error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Ошибка запуска симуляции',
        timestamp: Date.now(),
      };
      
      res.status(500).json(response);
    }
  });

  // Остановка симуляции
  router.post('/simulation/stop', (req, res) => {
    try {
      graphService.stopSimulation();
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Симуляция остановлена' },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Simulation stop error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Ошибка остановки симуляции',
        timestamp: Date.now(),
      };
      
      res.status(500).json(response);
    }
  });

  // Сброс физики
  router.post('/physics/reset', (req, res) => {
    try {
      graphService.resetPhysics();
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Физика сброшена' },
        timestamp: Date.now(),
      };

      res.json(response);
    } catch (error: any) {
      console.error('Physics reset error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Ошибка сброса физики',
        timestamp: Date.now(),
      };
      
      res.status(500).json(response);
    }
  });

  return router;
}
