'use client';

import { useState, useEffect } from 'react';

import { ApiService } from '../services/ApiService';

import type { GraphNode, GraphEdge, GraphData } from '../types';

import { GraphCanvas } from './GraphCanvas';
import { SearchBar } from './SearchBar';

interface Tab {
  id: string;
  title: string;
  type: 'main' | 'category' | 'topic';
  data?: GraphData;
}

interface Category {
  id: string;
  name: string;
  description: string;
  connections: string[];
}

export function ObsidianLayout() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'main', title: 'Главная', type: 'main' }]);
  const [activeTab, setActiveTab] = useState('main');
  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'science-map',
      name: 'Карта науки',
      description: 'Визуализация научных связей и исследований',
      connections: ['lectures', 'category3', 'category4'],
    },
    {
      id: 'lectures',
      name: 'Депозитарий лекций',
      description: 'Архив лекций и образовательных материалов',
      connections: ['science-map', 'category3', 'category4'],
    },
    {
      id: 'category3',
      name: '',
      description: 'Категория 3',
      connections: ['science-map', 'lectures', 'category4'],
    },
    {
      id: 'category4',
      name: '',
      description: 'Категория 4',
      connections: ['science-map', 'lectures', 'category3'],
    },
  ]);

  const [rightGraphData, setRightGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [error, setError] = useState<string | null>(null);

  const apiService = new ApiService();

  useEffect(() => {
    loadMainData();
    loadCategories();
  }, []);

  useEffect(() => {
    generateRightGraph();
  }, [categories]);

  const loadMainData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiService.getGraphData();
      setMainGraphData(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiService.getCategories();
      if (data && data.categories) {
        setCategories(data.categories);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки категорий:', err);
      // Используем дефолтные категории в случае ошибки
    }
  };

  const generateRightGraph = () => {
    const nodes: GraphNode[] = [
      {
        id: 'main',
        label: 'Главная',
        type: 'topic',
        x: 0,
        y: 0,
      },
    ];

    const edges: GraphEdge[] = [];

    categories.forEach((category, index) => {
      const angle = (index / categories.length) * 2 * Math.PI;
      const radius = 150;

      nodes.push({
        id: category.id,
        label: category.name,
        type: 'topic',
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });

      edges.push({
        id: `e-${category.id}`,
        source: 'main',
        target: category.id,
        type: 'related_to',
        weight: 0.8,
      });
    });

    setRightGraphData({ nodes, edges });
  };

  const handleCategoryClick = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    // Проверяем, есть ли уже такая вкладка
    const existingTab = tabs.find((tab) => tab.id === categoryId);
    if (existingTab) {
      setActiveTab(categoryId);
      return;
    }

    // Создаем новую вкладку с загрузкой данных
    const newTab: Tab = {
      id: categoryId,
      title: category.name || `Категория ${categoryId}`,
      type: 'category',
      data: { nodes: [], edges: [] }, // Временно пустой, загрузится асинхронно
    };

    setTabs([...tabs, newTab]);
    setActiveTab(categoryId);

    // Загружаем данные категории асинхронно
    try {
      const categoryData = await generateCategoryGraph(category);

      // Обновляем вкладку с загруженными данными
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === categoryId ? { ...tab, data: categoryData } : tab)),
      );
    } catch (error) {
      console.error('Ошибка загрузки данных категории:', error);
    }
  };

  const generateCategoryGraph = async (category: Category): Promise<GraphData> => {
    try {
      // Загружаем темы из базы данных для категории
      const response = await apiService.getCategoryTopics(category.id);
      const topics = response.topics || [];

      const nodes: GraphNode[] = [
        {
          id: category.id,
          label: category.name || `Категория ${category.id}`,
          type: 'topic',
          x: 0,
          y: 0,
        },
      ];

      const edges: GraphEdge[] = [];

      // Добавляем темы из базы данных
      topics.forEach((topic: any, index: number) => {
        const angle = (index / Math.max(topics.length, 1)) * 2 * Math.PI;
        const radius = 150;

        nodes.push({
          id: topic.id,
          label: topic.title || topic.name,
          type: 'topic',
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });

        edges.push({
          id: `e-${category.id}-${topic.id}`,
          source: category.id,
          target: topic.id,
          type: 'related_to',
          weight: 0.8,
        });
      });

      return { nodes, edges };
    } catch (error) {
      console.error('Ошибка загрузки тем категории:', error);

      // Возвращаем пустой граф в случае ошибки
      return {
        nodes: [
          {
            id: category.id,
            label: category.name || `Категория ${category.id}`,
            type: 'topic',
            x: 0,
            y: 0,
          },
        ],
        edges: [],
      };
    }
  };

  const handleTopicClick = (topicId: string, _categoryId: string) => {
    // Проверяем, есть ли уже такая вкладка
    const existingTab = tabs.find((tab) => tab.id === topicId);
    if (existingTab) {
      setActiveTab(topicId);
      return;
    }

    // Создаем новую вкладку для темы
    const newTab: Tab = {
      id: topicId,
      title: `Тема: ${topicId}`,
      type: 'topic',
    };

    setTabs([...tabs, newTab]);
    setActiveTab(topicId);
  };

  const closeTab = (tabId: string) => {
    if (tabId === 'main') return; // Главную вкладку нельзя закрыть

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTab === tabId) {
      setActiveTab('main');
    }
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="obsidian-layout">
      {/* Левая панель навигации */}
      <div className="left-panel">
        <div className="navigation-buttons">
          <button className="nav-button active" onClick={() => setActiveTab('main')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Главная</span>
          </button>
          <button className="nav-button" onClick={() => {}}>
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Поиск</span>
          </button>
          <button className="nav-button" onClick={() => {}}>
            <span className="nav-icon">📊</span>
            <span className="nav-label">Аналитика</span>
          </button>
          <button className="nav-button" onClick={() => {}}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Настройки</span>
          </button>
          <button className="nav-button" onClick={() => {}}>
            <span className="nav-icon">📚</span>
            <span className="nav-label">Справка</span>
          </button>
        </div>
      </div>

      {/* Центральная панель */}
      <div className="center-panel">
        {/* Вкладки */}
        <div className="tabs-container">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">
                {tab.type === 'main' && '🏠'}
                {tab.type === 'category' && '📁'}
                {tab.type === 'topic' && '📄'}
              </span>
              <span className="tab-title">{tab.title}</span>
              {tab.id !== 'main' && (
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="tab-add" onClick={() => {}} title="Добавить новую вкладку">
            +
          </button>
        </div>

        {/* Контент вкладки */}
        <div className="tab-content">
          {activeTab === 'main' ? (
            <div className="main-page">
              <div className="page-header">
                <h1>Главная</h1>
                <p>Система визуализации научных связей</p>
              </div>

              <div className="search-section">
                <SearchBar onSearch={() => {}} isLoading={false} />
              </div>

              <div className="categories-grid">
                <h2>Категории</h2>
                <div className="categories-list">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="category-item"
                      onClick={() => handleCategoryClick(category.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="category-icon">📁</div>
                      <div className="category-info">
                        <h3>{category.name || `Категория ${category.id}`}</h3>
                        <p>{category.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="error">{error}</div>}
            </div>
          ) : activeTabData?.type === 'category' ? (
            <div className="category-page">
              <div className="page-header">
                <h1>{activeTabData?.title}</h1>
                <p>Граф связей категории</p>
              </div>

              <div className="category-graph-container">
                {activeTabData?.data && (
                  <GraphCanvas
                    graphData={activeTabData.data}
                    physicsConfig={{
                      repulsion: 200,
                      attraction: 0.1,
                      gravity: 0.01,
                      damping: 0.9,
                      naturalLinkLength: 100,
                      maxLinkStretch: 200,
                      minLinkLength: 50,
                      springStiffness: 0.1,
                      springDamping: 0.8,
                      initialTemperature: 1000,
                      minTemperature: 0.1,
                      coolingRate: 0.95,
                      adaptiveFPS: true,
                      targetFPS: 60,
                      maxFPS: 120,
                      minFPS: 30,
                    }}
                    onGraphUpdate={() => {}}
                    isLoading={false}
                    onNodeClick={(nodeId) => {
                      // Клик по узлу
                      // Открываем новую вкладку с детальной информацией о теме
                      handleTopicClick(nodeId, activeTab);
                    }}
                  />
                )}
              </div>
            </div>
          ) : activeTabData?.type === 'topic' ? (
            <div className="topic-page">
              <div className="page-header">
                <h1>{activeTabData?.title}</h1>
                <p>Связи и информация о теме</p>
              </div>

              <div className="topic-content">
                <div className="topic-info">
                  <h2>Информация о теме</h2>
                  <p>ID темы: {activeTabData?.id}</p>
                  <p>Здесь отображается детальная информация о выбранной теме и её связях.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Правая панель с графом (везде) */}
      <div className="right-panel">
        <div className="panel-header">
          <h3>Связи главной страницы</h3>
        </div>
        <div className="right-graph-container">
          <GraphCanvas
            graphData={rightGraphData}
            physicsConfig={{
              repulsion: 150,
              attraction: 0.1,
              gravity: 0.01,
              damping: 0.9,
              naturalLinkLength: 80,
              maxLinkStretch: 150,
              minLinkLength: 40,
              springStiffness: 0.1,
              springDamping: 0.8,
              initialTemperature: 500,
              minTemperature: 0.1,
              coolingRate: 0.95,
              adaptiveFPS: true,
              targetFPS: 60,
              maxFPS: 120,
              minFPS: 30,
            }}
            onGraphUpdate={() => {}}
            isLoading={false}
            onNodeClick={handleCategoryClick}
          />
        </div>
      </div>
    </div>
  );
}
