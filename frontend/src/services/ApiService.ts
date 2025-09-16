import axios from 'axios';

import type { GraphData } from '../types';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

interface SearchRequest {
  query: string;
  limit: number;
}

interface SearchResponse {
  results: GraphData;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3004';
  }

  async getGraphData(): Promise<GraphData> {
    try {
      const response = await axios.get<ApiResponse<GraphData>>(`${this.baseUrl}/api/graph`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка получения данных графа');
      }

      return response.data.data!;
    } catch (error: any) {
      console.error('API Error (getGraphData):', error);
      throw new Error(error.response?.data?.error || 'Ошибка получения данных графа');
    }
  }

  async updateGraphData(data: GraphData): Promise<void> {
    try {
      const response = await axios.post<ApiResponse>(`${this.baseUrl}/api/graph/update`, data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка обновления данных графа');
      }
    } catch (error: any) {
      console.error('API Error (updateGraphData):', error);
      throw new Error(error.response?.data?.error || 'Ошибка обновления данных графа');
    }
  }

  async getGraphStats(): Promise<any> {
    try {
      const response = await axios.get<ApiResponse>(`${this.baseUrl}/api/graph/stats`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка получения статистики');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('API Error (getGraphStats):', error);
      throw new Error(error.response?.data?.error || 'Ошибка получения статистики');
    }
  }

  async search(query: string): Promise<GraphData> {
    try {
      const searchRequest: SearchRequest = {
        query,
        limit: 100,
      };

      const response = await axios.post<ApiResponse<SearchResponse>>(
        `${this.baseUrl}/api/search`,
        searchRequest,
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка поиска');
      }

      return response.data.data!.results;
    } catch (error: any) {
      console.error('API Error (search):', error);
      throw new Error(error.response?.data?.error || 'Ошибка поиска');
    }
  }

  async startSimulation(): Promise<void> {
    try {
      const response = await axios.post<ApiResponse>(`${this.baseUrl}/api/graph/simulation/start`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка запуска симуляции');
      }
    } catch (error: any) {
      console.error('API Error (startSimulation):', error);
      throw new Error(error.response?.data?.error || 'Ошибка запуска симуляции');
    }
  }

  async stopSimulation(): Promise<void> {
    try {
      const response = await axios.post<ApiResponse>(`${this.baseUrl}/api/graph/simulation/stop`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка остановки симуляции');
      }
    } catch (error: any) {
      console.error('API Error (stopSimulation):', error);
      throw new Error(error.response?.data?.error || 'Ошибка остановки симуляции');
    }
  }

  async resetPhysics(): Promise<void> {
    try {
      const response = await axios.post<ApiResponse>(`${this.baseUrl}/api/graph/physics/reset`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка сброса физики');
      }
    } catch (error: any) {
      console.error('API Error (resetPhysics):', error);
      throw new Error(error.response?.data?.error || 'Ошибка сброса физики');
    }
  }

  async getCategoryTopics(categoryId: string): Promise<any> {
    try {
      const response = await axios.get<ApiResponse>(
        `${this.baseUrl}/api/categories/${categoryId}/topics`,
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка получения тем категории');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('API Error (getCategoryTopics):', error);
      throw new Error(error.response?.data?.error || 'Ошибка получения тем категории');
    }
  }

  async getCategories(): Promise<any> {
    try {
      const response = await axios.get<ApiResponse>(`${this.baseUrl}/api/categories`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка получения категорий');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('API Error (getCategories):', error);
      throw new Error(error.response?.data?.error || 'Ошибка получения категорий');
    }
  }

  async getTopicConnections(topicId: string): Promise<any> {
    try {
      const response = await axios.get<ApiResponse>(
        `${this.baseUrl}/api/topics/${topicId}/connections`,
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Ошибка получения связей темы');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('API Error (getTopicConnections):', error);
      throw new Error(error.response?.data?.error || 'Ошибка получения связей темы');
    }
  }
}
