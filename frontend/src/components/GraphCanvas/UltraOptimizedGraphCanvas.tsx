'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  select,
  zoom,
  drag,
} from 'd3';

import { usePerformanceOptimization } from './hooks/usePerformanceOptimization';
import { useGraphVirtualization } from './hooks/useGraphVirtualization';
import { useOptimizedD3Simulation } from './hooks/useOptimizedD3Simulation';
import { PerformancePanel } from './PerformancePanel';

import type { GraphNode, GraphEdge, GraphData, PhysicsConfig } from '../../types';

interface UltraOptimizedGraphCanvasProps {
  graphData: GraphData;
  physicsConfig: PhysicsConfig;
  onGraphUpdate: (data: GraphData) => void;
  isLoading: boolean;
  onNodeClick?: (nodeId: string) => void;
  maxNodes?: number;
  enableVirtualization?: boolean;
  enableWebGL?: boolean;
  enableClustering?: boolean;
  enablePerformanceMonitoring?: boolean;
}

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export function UltraOptimizedGraphCanvas({
  graphData,
  physicsConfig,
  onGraphUpdate: _onGraphUpdate,
  isLoading,
  onNodeClick,
  maxNodes = 1000,
  enableVirtualization = true,
  enableWebGL = false,
  enableClustering = true,
  enablePerformanceMonitoring = true,
}: UltraOptimizedGraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Состояние viewport
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scale: 1,
  });

  // Хуки для оптимизации
  const {
    metrics,
    qualityLevel,
    isThrottled,
    throttledRender,
    optimizeDataForRendering,
    predictPerformance,
    getOptimizedSettings,
    onRenderStart,
    onRenderEnd,
  } = usePerformanceOptimization(
    graphData.nodes.length,
    graphData.edges.length,
    {
      targetFPS: 60,
      adaptiveQuality: true,
      enableThrottling: true,
    }
  );

  const {
    optimizedData,
    visibleNodes,
    visibleEdges,
    nodeClusters,
    lodLevel,
    expandCluster,
    collapseCluster,
  } = useGraphVirtualization(
    graphData.nodes,
    graphData.edges,
    viewportBounds,
    {
      maxVisibleNodes: maxNodes,
      enableClustering,
      clusterThreshold: 500,
      enableLevelOfDetail: true,
    }
  );

  const {
    startSimulation,
    stopSimulation,
    resetSimulation,
    heatUp,
    isRunning,
    isConverged,
    alpha,
    fps: simulationFPS,
    energy,
  } = useOptimizedD3Simulation(
    optimizedData.nodes,
    optimizedData.edges,
    {
      enableAdaptiveForces: true,
      enableSpatialOptimization: true,
      enableBarnesHut: true,
      targetFPS: 60,
    }
  );

  // Предсказание производительности
  const performancePrediction = useMemo(() => {
    return predictPerformance(
      graphData.nodes.length,
      graphData.edges.length,
      viewportBounds.scale
    );
  }, [graphData.nodes.length, graphData.edges.length, viewportBounds.scale, predictPerformance]);

  // Оптимизированные настройки рендеринга
  const renderSettings = useMemo(() => {
    return getOptimizedSettings();
  }, [getOptimizedSettings]);

  // WebGL рендеринг
  const renderWithWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enableWebGL) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL не поддерживается, переключаемся на Canvas 2D');
      return;
    }

    // Здесь будет WebGL рендеринг
    // Пока что просто очищаем canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
  }, [enableWebGL]);

  // Canvas 2D рендеринг
  const renderWithCanvas2D = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    onRenderStart();

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применяем трансформацию viewport
    ctx.save();
    ctx.translate(-viewportBounds.x, -viewportBounds.y);
    ctx.scale(viewportBounds.scale, viewportBounds.scale);

    // Рендерим только видимые связи
    optimizedData.edges.forEach(edge => {
      const sourceNode = optimizedData.nodes.find(n => n.id === edge.source);
      const targetNode = optimizedData.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode && 
          sourceNode.x !== undefined && sourceNode.y !== undefined &&
          targetNode.x !== undefined && targetNode.y !== undefined) {
        
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        // Стиль рёбер в зависимости от качества
        ctx.strokeStyle = '#999';
        ctx.lineWidth = renderSettings.edgeWidth;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
      }
    });

    // Рендерим только видимые узлы
    optimizedData.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        const radius = renderSettings.nodeRadius;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(node.type);
        ctx.fill();
        
        if (renderSettings.enableShadows) {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 4;
        }
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Рендерим подпись только если включено
        if (renderSettings.enableLabels && viewportBounds.scale > 0.5) {
          ctx.fillStyle = '#333';
          ctx.font = `${renderSettings.labelSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + radius + 15);
        }
      }
    });

    ctx.restore();
    onRenderEnd();
  }, [optimizedData, viewportBounds, renderSettings, onRenderStart, onRenderEnd]);

  // Основной рендеринг
  const render = useCallback(() => {
    throttledRender(() => {
      if (enableWebGL) {
        renderWithWebGL();
      } else {
        renderWithCanvas2D();
      }
    });
  }, [throttledRender, enableWebGL, renderWithWebGL, renderWithCanvas2D]);

  // Инициализация D3 симуляции
  useEffect(() => {
    if (!svgRef.current || optimizedData.nodes.length === 0) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Очищаем предыдущий граф
    svg.selectAll('*').remove();

    // Создаем контейнер для зума и панорамирования
    const container = svg.append('g');

    // Создаем зум поведение
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        const transform = event.transform;
        setViewportBounds({
          x: -transform.x / transform.k,
          y: -transform.y / transform.k,
          width: width / transform.k,
          height: height / transform.k,
          scale: transform.k,
        });
        container.attr('transform', transform);
      });

    svg.call(zoomBehavior);

    // Создаем узлы
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(optimizedData.nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => renderSettings.nodeRadius)
      .attr('fill', (d) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onNodeClick) {
          onNodeClick(d.id);
        }
      })
      .call(
        drag<SVGCircleElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

    // Добавляем подписи к узлам
    const labels = container
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(optimizedData.nodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', `${renderSettings.labelSize}px`)
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => renderSettings.nodeRadius + 15)
      .style('pointer-events', 'none')
      .style('display', (d) => {
        return renderSettings.enableLabels && viewportBounds.scale > 0.5 ? 'block' : 'none';
      });

    // Функции для перетаскивания
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: any) {
      if (!event.active) {
        startSimulation();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: any) {
      if (!event.active) {
        stopSimulation();
      }
      d.fx = null;
      d.fy = null;
    }

    // Обновление позиций при каждой итерации симуляции
    const updatePositions = () => {
      node
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!)
        .style('opacity', (d) => visibleNodes.has(d.id) ? 1 : 0);

      labels
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!)
        .style('display', (d) => {
          const isVisible = visibleNodes.has(d.id);
          const isLargeEnough = viewportBounds.scale > 0.5;
          return isVisible && isLargeEnough && renderSettings.enableLabels ? 'block' : 'none';
        });
    };

    // Запускаем симуляцию
    startSimulation();

    // Очистка при размонтировании
    return () => {
      stopSimulation();
    };
  }, [optimizedData, renderSettings, visibleNodes, viewportBounds.scale, startSimulation, stopSimulation]);

  // Анимационный цикл для Canvas рендеринга
  useEffect(() => {
    if (enableWebGL || !enableVirtualization) {
      const animate = () => {
        render();
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [render, enableWebGL, enableVirtualization]);

  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'paper':
        return '#e74c3c';
      case 'author':
        return '#3498db';
      case 'institution':
        return '#9b59b6';
      case 'topic':
        return '#2ecc71';
      case 'cluster':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  // Обработка изменения размера
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        setViewportBounds(prev => ({
          ...prev,
          width,
          height,
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Обработчики для панели производительности
  const handleQualityChange = useCallback((quality: 'high' | 'medium' | 'low') => {
    // Логика изменения качества будет в хуке usePerformanceOptimization
  }, []);

  const handleToggleVirtualization = useCallback(() => {
    // Логика переключения виртуализации
  }, []);

  const handleToggleWebGL = useCallback(() => {
    // Логика переключения WebGL
  }, []);

  const handleToggleClustering = useCallback(() => {
    // Логика переключения кластеризации
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* SVG для D3 симуляции */}
      <svg
        ref={svgRef}
        className="ultra-optimized-graph-canvas"
        style={{ width: '100%', height: '500px', border: '1px solid #ccc' }}
      />

      {/* Canvas для WebGL/2D рендеринга */}
      {enableWebGL && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Панель производительности */}
      {enablePerformanceMonitoring && (
        <PerformancePanel
          metrics={{
            fps: simulationFPS,
            frameTime: metrics.frameTime,
            memoryUsage: metrics.memoryUsage,
            nodeCount: graphData.nodes.length,
            edgeCount: graphData.edges.length,
            visibleNodes: optimizedData.visibleNodesCount,
            renderTime: metrics.renderTime,
          }}
          qualityLevel={qualityLevel}
          isThrottled={isThrottled}
          onQualityChange={handleQualityChange}
          onToggleVirtualization={handleToggleVirtualization}
          onToggleWebGL={handleToggleWebGL}
          onToggleClustering={handleToggleClustering}
          virtualizationEnabled={enableVirtualization}
          webglEnabled={enableWebGL}
          clusteringEnabled={enableClustering}
        />
      )}

      {/* Панель управления симуляцией */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button onClick={resetSimulation}>Сброс</button>
        <button onClick={heatUp}>Нагреть</button>
        <button onClick={startSimulation} disabled={isRunning}>
          {isRunning ? 'Запущена' : 'Запустить'}
        </button>
        <button onClick={stopSimulation} disabled={!isRunning}>
          Остановить
        </button>
      </div>

      {/* Информация о симуляции */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <div>Симуляция: {isRunning ? 'Активна' : 'Остановлена'}</div>
        <div>Сходимость: {isConverged ? 'Да' : 'Нет'}</div>
        <div>Alpha: {alpha.toFixed(3)}</div>
        <div>Энергия: {energy.toFixed(2)}</div>
        <div>LOD: {lodLevel}</div>
        <div>Кластеров: {nodeClusters.length}</div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#7f8c8d' }}>
          Обновление данных...
        </div>
      )}
    </div>
  );
}

