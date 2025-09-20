'use client';

import React, { useState } from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  nodeCount: number;
  edgeCount: number;
  visibleNodes: number;
  renderTime: number;
}

export interface PerformancePanelProps {
  metrics: PerformanceMetrics;
  qualityLevel: 'high' | 'medium' | 'low';
  isThrottled: boolean;
  onQualityChange: (quality: 'high' | 'medium' | 'low') => void;
  onToggleVirtualization: () => void;
  onToggleWebGL: () => void;
  onToggleClustering: () => void;
  virtualizationEnabled: boolean;
  webglEnabled: boolean;
  clusteringEnabled: boolean;
}

export function PerformancePanel({
  metrics,
  qualityLevel,
  isThrottled,
  onQualityChange,
  onToggleVirtualization,
  onToggleWebGL,
  onToggleClustering,
  virtualizationEnabled,
  webglEnabled,
  clusteringEnabled,
}: PerformancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getFPSColor = (fps: number) => {
    if (fps >= 60) return '#2ecc71';
    if (fps >= 30) return '#f39c12';
    return '#e74c3c';
  };

  const getMemoryColor = (memory: number) => {
    const mb = memory / 1024 / 1024;
    if (mb < 50) return '#2ecc71';
    if (mb < 100) return '#f39c12';
    return '#e74c3c';
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '250px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        zIndex: 1000,
      }}
    >
      {/* Заголовок */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ margin: 0, fontSize: '14px', color: '#333' }}>
          Производительность
        </h3>
        <span style={{ fontSize: '16px', color: '#666' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Основные метрики */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>FPS:</span>
          <span style={{ color: getFPSColor(metrics.fps), fontWeight: 'bold' }}>
            {metrics.fps}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Время кадра:</span>
          <span>{metrics.frameTime.toFixed(1)}ms</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Память:</span>
          <span style={{ color: getMemoryColor(metrics.memoryUsage) }}>
            {formatMemory(metrics.memoryUsage)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Время рендера:</span>
          <span>{metrics.renderTime.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Статус оптимизаций */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Качество:</span>
          <span style={{ 
            color: qualityLevel === 'high' ? '#2ecc71' : qualityLevel === 'medium' ? '#f39c12' : '#e74c3c',
            fontWeight: 'bold'
          }}>
            {qualityLevel === 'high' ? 'Высокое' : qualityLevel === 'medium' ? 'Среднее' : 'Низкое'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Троттлинг:</span>
          <span style={{ color: isThrottled ? '#f39c12' : '#2ecc71' }}>
            {isThrottled ? 'Активен' : 'Отключен'}
          </span>
        </div>
      </div>

      {/* Расширенные настройки */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
          {/* Управление качеством */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Качество рендеринга:</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['high', 'medium', 'low'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => onQualityChange(level)}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: qualityLevel === level ? '#007bff' : '#fff',
                    color: qualityLevel === level ? '#fff' : '#333',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {level === 'high' ? 'Высокое' : level === 'medium' ? 'Среднее' : 'Низкое'}
                </button>
              ))}
            </div>
          </div>

          {/* Переключатели оптимизаций */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Оптимизации:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={virtualizationEnabled}
                  onChange={onToggleVirtualization}
                  style={{ marginRight: '6px' }}
                />
                Виртуализация
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={webglEnabled}
                  onChange={onToggleWebGL}
                  style={{ marginRight: '6px' }}
                />
                WebGL рендеринг
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={clusteringEnabled}
                  onChange={onToggleClustering}
                  style={{ marginRight: '6px' }}
                />
                Кластеризация
              </label>
            </div>
          </div>

          {/* Детальная статистика */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Статистика графа:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Всего узлов:</span>
              <span>{metrics.nodeCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Всего связей:</span>
              <span>{metrics.edgeCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Видимых узлов:</span>
              <span>{metrics.visibleNodes}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Процент видимых:</span>
              <span>
                {metrics.nodeCount > 0 
                  ? ((metrics.visibleNodes / metrics.nodeCount) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>

          {/* Рекомендации */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '8px', 
            borderRadius: '4px',
            fontSize: '11px',
            color: '#666'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Рекомендации:</div>
            {metrics.fps < 30 && (
              <div>• Снизьте качество рендеринга</div>
            )}
            {metrics.memoryUsage > 100 * 1024 * 1024 && (
              <div>• Включите виртуализацию</div>
            )}
            {metrics.nodeCount > 1000 && (
              <div>• Включите кластеризацию</div>
            )}
            {metrics.fps >= 60 && metrics.memoryUsage < 50 * 1024 * 1024 && (
              <div>• Можно повысить качество</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

