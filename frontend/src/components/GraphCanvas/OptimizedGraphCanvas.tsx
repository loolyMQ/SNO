'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  select,
  zoom,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  drag,
} from 'd3';

import type { GraphNode, GraphEdge, GraphData, PhysicsConfig } from '../../types';

interface OptimizedGraphCanvasProps {
  graphData: GraphData;
  physicsConfig: PhysicsConfig;
  onGraphUpdate: (data: GraphData) => void;
  isLoading: boolean;
  onNodeClick?: (nodeId: string) => void;
  maxNodes?: number;
  enableVirtualization?: boolean;
  enableWebGL?: boolean;
}

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

interface NodeCluster {
  id: string;
  nodes: GraphNode[];
  centerX: number;
  centerY: number;
  radius: number;
  level: number;
}

export function OptimizedGraphCanvas({
  graphData,
  physicsConfig,
  onGraphUpdate: _onGraphUpdate,
  isLoading,
  onNodeClick,
  maxNodes = 1000,
  enableVirtualization = true,
  enableWebGL = false,
}: OptimizedGraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);
  
  // Состояние для виртуализации
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scale: 1,
  });
  
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [nodeClusters, setNodeClusters] = useState<NodeCluster[]>([]);
  const [isClustering, setIsClustering] = useState(false);

  // Оптимизированные данные графа
  const optimizedGraphData = useMemo(() => {
    if (graphData.nodes.length <= maxNodes) {
      return graphData;
    }

    // Если узлов слишком много, применяем кластеризацию
    if (enableVirtualization) {
      return clusterNodes(graphData, maxNodes);
    }

    // Иначе просто ограничиваем количество узлов
    return {
      nodes: graphData.nodes.slice(0, maxNodes),
      edges: graphData.edges.filter(
        edge => 
          graphData.nodes.slice(0, maxNodes).some(n => n.id === edge.source) &&
          graphData.nodes.slice(0, maxNodes).some(n => n.id === edge.target)
      ),
    };
  }, [graphData, maxNodes, enableVirtualization]);

  // Функция кластеризации узлов
  const clusterNodes = useCallback((data: GraphData, maxNodes: number): GraphData => {
    if (data.nodes.length <= maxNodes) {
      return data;
    }

    setIsClustering(true);
    
    // Простая кластеризация по позиции
    const clusters: NodeCluster[] = [];
    const clusterSize = Math.ceil(data.nodes.length / maxNodes);
    const gridSize = Math.ceil(Math.sqrt(maxNodes));
    
    // Создаем сетку кластеров
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const clusterId = `cluster_${i}_${j}`;
        const centerX = (i + 0.5) * (800 / gridSize);
        const centerY = (j + 0.5) * (600 / gridSize);
        
        clusters.push({
          id: clusterId,
          nodes: [],
          centerX,
          centerY,
          radius: Math.min(800, 600) / (gridSize * 2),
          level: 0,
        });
      }
    }

    // Распределяем узлы по кластерам
    data.nodes.forEach((node, index) => {
      const clusterIndex = Math.floor(index / clusterSize);
      if (clusterIndex < clusters.length) {
        clusters[clusterIndex].nodes.push(node);
      }
    });

    // Создаем представительные узлы для кластеров
    const representativeNodes: GraphNode[] = clusters.map(cluster => ({
      id: cluster.id,
      label: `Кластер (${cluster.nodes.length})`,
      type: 'cluster',
      x: cluster.centerX,
      y: cluster.centerY,
      connections: cluster.nodes.reduce((sum, node) => sum + (node.connections || 0), 0),
    }));

    // Создаем связи между кластерами
    const representativeEdges: GraphEdge[] = [];
    data.edges.forEach(edge => {
      const sourceCluster = clusters.find(c => c.nodes.some(n => n.id === edge.source));
      const targetCluster = clusters.find(c => c.nodes.some(n => n.id === edge.target));
      
      if (sourceCluster && targetCluster && sourceCluster.id !== targetCluster.id) {
        const existingEdge = representativeEdges.find(
          e => e.source === sourceCluster.id && e.target === targetCluster.id
        );
        
        if (existingEdge) {
          existingEdge.weight = (existingEdge.weight || 0) + (edge.weight || 1);
        } else {
          representativeEdges.push({
            id: `${sourceCluster.id}_${targetCluster.id}`,
            source: sourceCluster.id,
            target: targetCluster.id,
            weight: edge.weight || 1,
          });
        }
      }
    });

    setNodeClusters(clusters);
    setIsClustering(false);

    return {
      nodes: representativeNodes,
      edges: representativeEdges,
    };
  }, []);

  // Определение видимых узлов для виртуализации
  const updateVisibleNodes = useCallback(() => {
    if (!enableVirtualization) {
      setVisibleNodes(new Set(optimizedGraphData.nodes.map(n => n.id)));
      return;
    }

    const visible = new Set<string>();
    const margin = 100; // Запас для плавного появления

    optimizedGraphData.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        const screenX = (node.x - viewportBounds.x) * viewportBounds.scale;
        const screenY = (node.y - viewportBounds.y) * viewportBounds.scale;
        
        if (
          screenX >= -margin &&
          screenX <= viewportBounds.width + margin &&
          screenY >= -margin &&
          screenY <= viewportBounds.height + margin
        ) {
          visible.add(node.id);
        }
      }
    });

    setVisibleNodes(visible);
  }, [optimizedGraphData.nodes, viewportBounds, enableVirtualization]);

  // WebGL рендеринг (если доступен)
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

    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применяем трансформацию viewport
    ctx.save();
    ctx.translate(-viewportBounds.x, -viewportBounds.y);
    ctx.scale(viewportBounds.scale, viewportBounds.scale);

    // Рендерим только видимые связи
    optimizedGraphData.edges.forEach(edge => {
      const sourceNode = optimizedGraphData.nodes.find(n => n.id === edge.source);
      const targetNode = optimizedGraphData.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode && 
          sourceNode.x !== undefined && sourceNode.y !== undefined &&
          targetNode.x !== undefined && targetNode.y !== undefined) {
        
        // Проверяем, видимы ли узлы
        if (visibleNodes.has(edge.source) || visibleNodes.has(edge.target)) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = '#999';
          ctx.lineWidth = Math.max(1, (edge.weight || 1) * 0.5);
          ctx.globalAlpha = 0.6;
          ctx.stroke();
        }
      }
    });

    // Рендерим только видимые узлы
    optimizedGraphData.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && visibleNodes.has(node.id)) {
        const radius = getNodeRadius(node.type);
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(node.type);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Рендерим подпись только для крупных узлов
        if (viewportBounds.scale > 0.5) {
          ctx.fillStyle = '#333';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y + radius + 15);
        }
      }
    });

    ctx.restore();
  }, [optimizedGraphData, viewportBounds, visibleNodes]);

  // Оптимизированный рендеринг
  const render = useCallback(() => {
    const currentTime = performance.now();
    
    // Ограничиваем FPS для производительности
    if (currentTime - lastRenderTimeRef.current < 16) { // ~60 FPS
      return;
    }
    
    lastRenderTimeRef.current = currentTime;

    if (enableWebGL) {
      renderWithWebGL();
    } else {
      renderWithCanvas2D();
    }
  }, [enableWebGL, renderWithWebGL, renderWithCanvas2D]);

  // Инициализация D3 симуляции
  useEffect(() => {
    if (!svgRef.current || optimizedGraphData.nodes.length === 0) return;

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

    // Создаем оптимизированную симуляцию
    const simulation = forceSimulation<GraphNode>(optimizedGraphData.nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphEdge>(optimizedGraphData.edges)
          .id((d) => d.id)
          .distance(physicsConfig.naturalLinkLength)
          .strength((d: any) => {
            // Адаптивная сила связи
            const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
            const targetId = typeof d.target === 'string' ? d.target : d.target.id;

            const sourceConnections = optimizedGraphData.edges.filter(
              (edge) => edge.source === sourceId || edge.target === sourceId,
            ).length;
            const targetConnections = optimizedGraphData.edges.filter(
              (edge) => edge.source === targetId || edge.target === targetId,
            ).length;

            const minConnections = Math.min(sourceConnections, targetConnections);
            const strengthMultiplier = minConnections === 1 ? 0.3 : 1.0;

            return physicsConfig.attraction * strengthMultiplier;
          }),
      )
      .force(
        'charge',
        forceManyBody().strength((d: any) => {
          // Адаптивная сила отталкивания
          const connections = optimizedGraphData.edges.filter(
            (edge) => edge.source === d.id || edge.target === d.id,
          ).length;

          const chargeMultiplier = connections === 1 ? 0.5 : 1.0;
          return -physicsConfig.repulsion * chargeMultiplier;
        }),
      )
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide().radius(20));

    simulationRef.current = simulation;

    // Создаем связи (только видимые)
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(optimizedGraphData.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.max(1, (d.weight || 1) * 0.5));

    // Создаем узлы (только видимые)
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(optimizedGraphData.nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => getNodeRadius(d.type))
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

    // Добавляем подписи к узлам (только для видимых)
    const labels = container
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(optimizedGraphData.nodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', '12px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => getNodeRadius(d.type) + 15)
      .style('pointer-events', 'none')
      .style('display', (d) => {
        // Показываем подписи только для крупных узлов
        return viewportBounds.scale > 0.5 ? 'block' : 'none';
      });

    // Функции для перетаскивания
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: any) {
      if (!event.active && simulationRef.current) {
        simulationRef.current.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: any) {
      if (!event.active && simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
      d.fx = null;
      d.fy = null;
    }

    // Оптимизированное обновление позиций
    simulation.on('tick', () => {
      // Обновляем только видимые элементы
      link
        .attr('x1', (d: any) => (d.source as any).x!)
        .attr('y1', (d: any) => (d.source as any).y!)
        .attr('x2', (d: any) => (d.target as any).x!)
        .attr('y2', (d: any) => (d.target as any).y!)
        .style('opacity', (d: any) => {
          const sourceVisible = visibleNodes.has((d.source as any).id);
          const targetVisible = visibleNodes.has((d.target as any).id);
          return sourceVisible || targetVisible ? 0.6 : 0;
        });

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
          return isVisible && isLargeEnough ? 'block' : 'none';
        });
    });

    // Очистка при размонтировании
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [optimizedGraphData, physicsConfig, visibleNodes, viewportBounds.scale]);

  // Обновление видимых узлов при изменении viewport
  useEffect(() => {
    updateVisibleNodes();
  }, [updateVisibleNodes]);

  // Анимационный цикл для Canvas рендеринга
  useEffect(() => {
    if (enableWebGL || !enableVirtualization) {
      const animate = () => {
        render();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, enableWebGL, enableVirtualization]);

  const getNodeRadius = (type: string): number => {
    switch (type) {
      case 'paper':
        return 8;
      case 'author':
        return 6;
      case 'institution':
        return 10;
      case 'topic':
        return 7;
      case 'cluster':
        return 12;
      default:
        return 5;
    }
  };

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
      if (svgRef.current && simulationRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        setViewportBounds(prev => ({
          ...prev,
          width,
          height,
        }));

        simulationRef.current.force('center', forceCenter(width / 2, height / 2)).restart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* SVG для D3 симуляции */}
      <svg
        ref={svgRef}
        className="graph-canvas"
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

      {/* Панель информации о производительности */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <div>Узлов: {optimizedGraphData.nodes.length}</div>
        <div>Связей: {optimizedGraphData.edges.length}</div>
        <div>Видимых узлов: {visibleNodes.size}</div>
        <div>Кластеризация: {isClustering ? 'В процессе...' : 'Готово'}</div>
        <div>Виртуализация: {enableVirtualization ? 'Включена' : 'Отключена'}</div>
        <div>WebGL: {enableWebGL ? 'Включен' : 'Отключен'}</div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#7f8c8d' }}>
          Обновление данных...
        </div>
      )}
    </div>
  );
}

