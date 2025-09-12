'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge, GraphData, PhysicsConfig } from '../types';

interface GraphCanvasProps {
  graphData: GraphData;
  physicsConfig: PhysicsConfig;
  onGraphUpdate: (data: GraphData) => void;
  isLoading: boolean;
}

export function GraphCanvas({ graphData, physicsConfig, onGraphUpdate, isLoading }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [temperature, setTemperature] = useState(1000);
  const [fps, setFps] = useState(0);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  // Инициализация D3 графа
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Очищаем предыдущий граф
    svg.selectAll('*').remove();

    // Создаем контейнер для зума и панорамирования
    const container = svg.append('g');

    // Создаем зум поведение
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Создаем симуляцию
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(graphData.edges)
        .id(d => d.id)
        .distance(physicsConfig.naturalLinkLength)
        .strength(d => {
          // Адаптивная сила связи в зависимости от количества связей узла
          const sourceConnections = graphData.edges.filter(edge => 
            edge.source === d.source.id || edge.target === d.source.id
          ).length;
          const targetConnections = graphData.edges.filter(edge => 
            edge.source === d.target.id || edge.target === d.target.id
          ).length;
          
          // Уменьшаем силу связи для узлов с одной связью
          const minConnections = Math.min(sourceConnections, targetConnections);
          const strengthMultiplier = minConnections === 1 ? 0.3 : 1.0;
          
          return physicsConfig.attraction * strengthMultiplier;
        }))
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // Адаптивная сила отталкивания в зависимости от количества связей
          const connections = graphData.edges.filter(edge => 
            edge.source === d.id || edge.target === d.id
          ).length;
          
          // Узлы с одной связью имеют меньшую силу отталкивания
          const chargeMultiplier = connections === 1 ? 0.5 : 1.0;
          
          return -physicsConfig.repulsion * chargeMultiplier;
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(20));

    simulationRef.current = simulation;

    // Создаем связи
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Создаем узлы
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter().append('circle')
      .attr('r', d => getNodeRadius(d.type))
      .attr('fill', d => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Добавляем подписи к узлам
    const labels = container.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(graphData.nodes)
      .enter().append('text')
      .text(d => d.label)
      .attr('font-size', '12px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d.type) + 15)
      .style('pointer-events', 'none');

    // Функции для перетаскивания
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active && simulationRef.current) {
        simulationRef.current.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active && simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
      d.fx = null;
      d.fy = null;
    }

    // Обновление позиций при каждой итерации симуляции
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Запускаем симуляцию
    setIsSimulating(true);
    setTemperature(1000);

    // Симуляция охлаждения температуры
    const coolingInterval = setInterval(() => {
      setTemperature(prev => {
        const newTemp = prev * physicsConfig.coolingRate;
        return newTemp < physicsConfig.minTemperature ? physicsConfig.minTemperature : newTemp;
      });
    }, 100);

    // Очистка при размонтировании
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      clearInterval(coolingInterval);
    };

  }, [graphData, physicsConfig]);

  const getNodeRadius = (type: string): number => {
    switch (type) {
      case 'paper': return 8;
      case 'author': return 6;
      case 'institution': return 10;
      case 'topic': return 7;
      default: return 5;
    }
  };

  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'paper': return '#e74c3c';
      case 'author': return '#3498db';
      case 'institution': return '#9b59b6';
      case 'topic': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const startSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
      setIsSimulating(true);
    }
  }, []);

  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      setIsSimulating(false);
    }
  }, []);

  // Обработка изменения размера
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && simulationRef.current) {
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        
        simulationRef.current
          .force('center', d3.forceCenter(width / 2, height / 2))
          .restart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button 
          onClick={isSimulating ? stopSimulation : startSimulation}
          className="button"
        >
          {isSimulating ? 'Остановить' : 'Запустить'} симуляцию
        </button>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Температура: <strong>{temperature.toFixed(1)}</strong></span>
          <span>FPS: <strong>{fps}</strong></span>
          <span>Узлов: <strong>{graphData.nodes.length}</strong></span>
          <span>Связей: <strong>{graphData.edges.length}</strong></span>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        className="graph-canvas"
        style={{ width: '100%', height: '500px', border: '1px solid #ccc' }}
      />
      
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#7f8c8d' }}>
          Обновление данных...
        </div>
      )}
      
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        <p><strong>Управление:</strong></p>
        <p>• Перетаскивание узлов - клик и перетаскивание</p>
        <p>• Панорамирование - клик и перетаскивание по пустому месту</p>
        <p>• Масштабирование - колесо мыши</p>
      </div>
    </div>
  );
}