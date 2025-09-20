'use client';

import React, { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export interface GraphFilter {
  nodeTypes: string[];
  edgeTypes: string[];
  minNodeSize: number;
  maxNodeSize: number;
  minEdgeWeight: number;
  maxEdgeWeight: number;
  showLabels: boolean;
  showClusters: boolean;
  highlightConnected: boolean;
  hideIsolated: boolean;
}

export interface GraphFiltersProps {
  onFiltersChange: (filters: GraphFilter) => void;
  availableNodeTypes: string[];
  availableEdgeTypes: string[];
  initialFilters?: Partial<GraphFilter>;
}

export function GraphFilters({
  onFiltersChange,
  availableNodeTypes,
  availableEdgeTypes,
  initialFilters = {},
}: GraphFiltersProps) {
  const [filters, setFilters] = useState<GraphFilter>({
    nodeTypes: availableNodeTypes,
    edgeTypes: availableEdgeTypes,
    minNodeSize: 1,
    maxNodeSize: 20,
    minEdgeWeight: 0,
    maxEdgeWeight: 10,
    showLabels: true,
    showClusters: true,
    highlightConnected: false,
    hideIsolated: false,
    ...initialFilters,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Обновление фильтров
  const updateFilters = useCallback((newFilters: Partial<GraphFilter>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [filters, onFiltersChange]);

  // Переключение типа узла
  const toggleNodeType = useCallback((nodeType: string) => {
    const newNodeTypes = filters.nodeTypes.includes(nodeType)
      ? filters.nodeTypes.filter(type => type !== nodeType)
      : [...filters.nodeTypes, nodeType];
    updateFilters({ nodeTypes: newNodeTypes });
  }, [filters.nodeTypes, updateFilters]);

  // Переключение типа связи
  const toggleEdgeType = useCallback((edgeType: string) => {
    const newEdgeTypes = filters.edgeTypes.includes(edgeType)
      ? filters.edgeTypes.filter(type => type !== edgeType)
      : [...filters.edgeTypes, edgeType];
    updateFilters({ edgeTypes: newEdgeTypes });
  }, [filters.edgeTypes, updateFilters]);

  // Сброс фильтров
  const resetFilters = useCallback(() => {
    const defaultFilters: GraphFilter = {
      nodeTypes: availableNodeTypes,
      edgeTypes: availableEdgeTypes,
      minNodeSize: 1,
      maxNodeSize: 20,
      minEdgeWeight: 0,
      maxEdgeWeight: 10,
      showLabels: true,
      showClusters: true,
      highlightConnected: false,
      hideIsolated: false,
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  }, [availableNodeTypes, availableEdgeTypes, onFiltersChange]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Заголовок */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Фильтры графа</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              Сбросить
            </Button>
          </div>
        </div>

        {/* Быстрые переключатели */}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.showLabels}
              onChange={(e) => updateFilters({ showLabels: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Показывать подписи</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.showClusters}
              onChange={(e) => updateFilters({ showClusters: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Показывать кластеры</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.highlightConnected}
              onChange={(e) => updateFilters({ highlightConnected: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Подсветка связей</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.hideIsolated}
              onChange={(e) => updateFilters({ hideIsolated: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Скрыть изолированные</span>
          </label>
        </div>

        {/* Расширенные фильтры */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Типы узлов */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Типы узлов:
              </label>
              <div className="flex flex-wrap gap-2">
                {availableNodeTypes.map((nodeType) => (
                  <button
                    key={nodeType}
                    onClick={() => toggleNodeType(nodeType)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      filters.nodeTypes.includes(nodeType)
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-gray-100 border-gray-300 text-gray-600'
                    }`}
                  >
                    {nodeType}
                  </button>
                ))}
              </div>
            </div>

            {/* Типы связей */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Типы связей:
              </label>
              <div className="flex flex-wrap gap-2">
                {availableEdgeTypes.map((edgeType) => (
                  <button
                    key={edgeType}
                    onClick={() => toggleEdgeType(edgeType)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      filters.edgeTypes.includes(edgeType)
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-gray-100 border-gray-300 text-gray-600'
                    }`}
                  >
                    {edgeType}
                  </button>
                ))}
              </div>
            </div>

            {/* Размер узлов */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Мин. размер узла:
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={filters.minNodeSize}
                  onChange={(e) => updateFilters({ minNodeSize: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{filters.minNodeSize}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Макс. размер узла:
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={filters.maxNodeSize}
                  onChange={(e) => updateFilters({ maxNodeSize: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{filters.maxNodeSize}</div>
              </div>
            </div>

            {/* Вес связей */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Мин. вес связи:
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.minEdgeWeight}
                  onChange={(e) => updateFilters({ minEdgeWeight: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{filters.minEdgeWeight.toFixed(1)}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Макс. вес связи:
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.maxEdgeWeight}
                  onChange={(e) => updateFilters({ maxEdgeWeight: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{filters.maxEdgeWeight.toFixed(1)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Статистика фильтров */}
        <div className="pt-4 border-t">
          <div className="text-sm text-gray-600">
            Активные фильтры: {filters.nodeTypes.length} типов узлов, {filters.edgeTypes.length} типов связей
          </div>
        </div>
      </div>
    </Card>
  );
}
