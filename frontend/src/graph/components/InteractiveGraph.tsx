import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGraphPhysics } from '../hooks/useGraphPhysics';
import { useGraphInteractivity } from '../hooks/useGraphInteractivity';
import { GraphNode, GraphEdge, GraphTransform } from '../types';

export interface InteractiveGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  className?: string;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeHover?: (edgeId: string | null) => void;
}

export const InteractiveGraph: React.FC<InteractiveGraphProps> = ({
  nodes,
  edges,
  width = 800,
  height = 600,
  className = '',
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onEdgeHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Инициализация физики графа
  const {
    startSimulation,
    stopSimulation,
    resetSimulation,
    heatUp,
    pinNode,
    unpinNode,
    isNodePinned,
    updateNodePosition,
    positions,
    temperature,
    fps,
    config: physicsConfig,
  } = useGraphPhysics({
    nodes,
    edges,
    onUpdate: useCallback((newPositions: Map<string, { x: number; y: number }>) => {
      // Обновляем позиции узлов для рендеринга
      if (canvasRef.current) {
        renderGraph();
      }
    }, []),
  });

  // Инициализация интерактивности
  const {
    transform,
    selectedNode,
    hoveredNode,
    hoveredEdge,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleNodeClick,
    handleEdgeClick,
    handleNodeHover,
    handleEdgeHover,
  } = useGraphInteractivity({
    nodes,
    edges,
    positions,
    onNodeClick,
    onEdgeClick,
    onNodeHover,
    onEdgeHover,
    updateNodePosition,
  });

  // Рендеринг графа
  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    // Применяем трансформацию
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Рендерим рёбра
    edges.forEach(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      
      if (!sourcePos || !targetPos) return;

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      
      // Стиль рёбер
      if (hoveredEdge === edge.id) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
      }
      
      ctx.stroke();
    });

    // Рендерим узлы
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      
      // Стиль узлов
      if (selectedNode === node.id) {
        ctx.fillStyle = '#007bff';
      } else if (hoveredNode === node.id) {
        ctx.fillStyle = '#ff6b6b';
      } else {
        ctx.fillStyle = '#666';
      }
      
      ctx.fill();
      
      // Обводка для закреплённых узлов
      if (isNodePinned(node.id)) {
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [nodes, edges, positions, transform, selectedNode, hoveredNode, hoveredEdge, isNodePinned, width, height]);

  // Инициализация canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    setIsInitialized(true);
  }, [width, height]);

  // Рендеринг при изменении данных
  useEffect(() => {
    if (isInitialized) {
      renderGraph();
    }
  }, [isInitialized, renderGraph]);

  // Обработчики событий мыши
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseDown(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseMove(e);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseUp();
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    handleWheel(e);
  };

  return (
    <div className={`interactive-graph ${className}`} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          cursor: 'grab',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleCanvasWheel}
      />
      
      {/* Панель управления */}
      <div
        className="graph-controls"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '10px',
          flexDirection: 'column',
        }}
      >
        <button onClick={resetSimulation}>Сброс</button>
        <button onClick={heatUp}>Нагреть</button>
        <button onClick={() => {
          // Центрирование графа
          const canvas = canvasRef.current;
          if (canvas) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            // Здесь можно добавить логику центрирования
          }
        }}>Центр</button>
        <button onClick={() => {
          // Очистка выбора
          // Здесь можно добавить логику очистки выбора
        }}>Очистить выбор</button>
        
        {/* Информация о симуляции */}
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div>FPS: {fps}</div>
          <div>Температура: {temperature.toFixed(1)}</div>
          <div>Узлов: {nodes.length}</div>
          <div>Рёбер: {edges.length}</div>
        </div>
      </div>
    </div>
  );
};