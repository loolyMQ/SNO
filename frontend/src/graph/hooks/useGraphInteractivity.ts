import { useCallback, useRef, useState } from 'react';
import { GraphNode, GraphEdge } from '../types';

export interface GraphTransform {
  x: number;
  y: number;
  scale: number;
}

export interface UseGraphInteractivityProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Map<string, { x: number; y: number }>;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeHover?: (edgeId: string | null) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
}

export function useGraphInteractivity({
  nodes,
  edges,
  positions,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onEdgeHover,
  updateNodePosition,
}: UseGraphInteractivityProps) {
  // Состояние трансформации
  const [transform, setTransform] = useState<GraphTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Состояние выбора и наведения
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  // Состояние перетаскивания
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);

  // Обработчик нажатия мыши
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Преобразуем координаты с учётом трансформации
    const worldX = (x - transform.x) / transform.scale;
    const worldY = (y - transform.y) / transform.scale;

    // Проверяем, кликнули ли на узел
    let clickedNode: string | null = null;
    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (pos) {
        const dx = worldX - pos.x;
        const dy = worldY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 8) { // радиус узла
          clickedNode = node.id;
          break;
        }
      }
    }

    if (clickedNode) {
      setDragNode(clickedNode);
      setSelectedNode(clickedNode);
      onNodeClick?.(clickedNode);
    } else {
      setSelectedNode(null);
      setIsDragging(true);
      setDragStart({ x, y });
    }
  }, [nodes, positions, transform, onNodeClick]);

  // Обработчик движения мыши
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragNode) {
      // Перетаскивание узла
      const worldX = (x - transform.x) / transform.scale;
      const worldY = (y - transform.y) / transform.scale;
      updateNodePosition(dragNode, worldX, worldY);
    } else if (isDragging && dragStart) {
      // Панорамирование
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x, y });
    } else {
      // Проверка наведения на узел или ребро
      const worldX = (x - transform.x) / transform.scale;
      const worldY = (y - transform.y) / transform.scale;

      // Проверяем узлы
      let hoveredNodeId: string | null = null;
      for (const node of nodes) {
        const pos = positions.get(node.id);
        if (pos) {
          const dx = worldX - pos.x;
          const dy = worldY - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 8) {
            hoveredNodeId = node.id;
            break;
          }
        }
      }

      // Проверяем рёбра
      let hoveredEdgeId: string | null = null;
      if (!hoveredNodeId) {
        for (const edge of edges) {
          const sourcePos = positions.get(edge.source);
          const targetPos = positions.get(edge.target);
          if (sourcePos && targetPos) {
            // Простая проверка расстояния до линии
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              const t = Math.max(0, Math.min(1, 
                ((worldX - sourcePos.x) * dx + (worldY - sourcePos.y) * dy) / (length * length)
              ));
              const projX = sourcePos.x + t * dx;
              const projY = sourcePos.y + t * dy;
              const distance = Math.sqrt(
                (worldX - projX) * (worldX - projX) + (worldY - projY) * (worldY - projY)
              );
              if (distance <= 5) {
                hoveredEdgeId = edge.id;
                break;
              }
            }
          }
        }
      }

      // Обновляем состояние наведения
      if (hoveredNode !== hoveredNodeId) {
        setHoveredNode(hoveredNodeId);
        onNodeHover?.(hoveredNodeId);
      }
      if (hoveredEdge !== hoveredEdgeId) {
        setHoveredEdge(hoveredEdgeId);
        onEdgeHover?.(hoveredEdgeId);
      }
    }
  }, [dragNode, isDragging, dragStart, transform, nodes, edges, positions, hoveredNode, hoveredEdge, onNodeHover, onEdgeHover, updateNodePosition]);

  // Обработчик отпускания мыши
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setDragNode(null);
  }, []);

  // Обработчик колеса мыши
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, transform.scale * scaleFactor));

    // Масштабирование относительно позиции мыши
    const scaleRatio = newScale / transform.scale;
    setTransform(prev => ({
      x: x - (x - prev.x) * scaleRatio,
      y: y - (y - prev.y) * scaleRatio,
      scale: newScale,
    }));
  }, [transform]);

  // Обработчики кликов
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    onNodeClick?.(nodeId);
  }, [onNodeClick]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    onEdgeClick?.(edgeId);
  }, [onEdgeClick]);

  // Обработчики наведения
  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNode(nodeId);
    onNodeHover?.(nodeId);
  }, [onNodeHover]);

  const handleEdgeHover = useCallback((edgeId: string | null) => {
    setHoveredEdge(edgeId);
    onEdgeHover?.(edgeId);
  }, [onEdgeHover]);

  return {
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
  };
}