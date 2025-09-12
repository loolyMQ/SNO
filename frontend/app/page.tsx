'use client';

import { useState, useEffect, useRef } from 'react';
import { GraphNode, GraphEdge, GraphData, PhysicsConfig } from '../src/types';
import { GraphCanvas } from '../src/components/GraphCanvas';
import { SearchBar } from '../src/components/SearchBar';
import { StatsPanel } from '../src/components/StatsPanel';
import { ControlsPanel } from '../src/components/ControlsPanel';
import { ApiService } from '../src/services/ApiService';

export default function HomePage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>({
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
  });

  const apiService = useRef(new ApiService());

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await apiService.current.getGraphData();
      setGraphData(data);
      
      const statsData = await apiService.current.getGraphStats();
      setStats(statsData);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const searchResults = await apiService.current.search(query);
      setGraphData(searchResults);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка поиска');
      console.error('Ошибка поиска:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhysicsConfigChange = (newConfig: Partial<PhysicsConfig>) => {
    setPhysicsConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleGraphUpdate = async (newData: GraphData) => {
    try {
      await apiService.current.updateGraphData(newData);
      setGraphData(newData);
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления графа');
      console.error('Ошибка обновления графа:', err);
    }
  };

  if (isLoading && graphData.nodes.length === 0) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Загрузка данных...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Карта науки</h1>
        <p>Система визуализации научных связей</p>
      </header>

      <main className="main">
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        <StatsPanel stats={stats} />

        <ControlsPanel
          physicsConfig={physicsConfig}
          onConfigChange={handlePhysicsConfigChange}
          onReload={loadInitialData}
        />

        <div className="graph-container">
          {graphData.nodes.length > 0 ? (
            <GraphCanvas
              graphData={graphData}
              physicsConfig={physicsConfig}
              onGraphUpdate={handleGraphUpdate}
              isLoading={isLoading}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              <p>Загрузка данных графа...</p>
              <p>Узлов: {graphData.nodes.length}</p>
              <p>Связей: {graphData.edges.length}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}