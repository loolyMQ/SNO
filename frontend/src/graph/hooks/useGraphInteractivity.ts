import { useCallback, useRef, useState } from 'react';
import { GraphNode, GraphEdge } from '../types';

export interface GraphTransform {
  x: number;
  y: number;
  k: number;
}

export interface GraphSelection {
  nodes: Set<string>;
  edges: Set<string>;
}

export interface GraphHover {
  node?: string;
  edge?: string;
}

export interface InteractivityConfig {
  enableDrag: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableHover: boolean;
  enableSelection: boolean;
  zoomSpeed: number;
  minZoom: number;
  maxZoom: number;
  panSpeed: number;
  hoverRadius?: number;
}

export interface UseGraphInteractivityProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  config?: Partial<InteractivityConfig>;
  onNodeDrag?: (nodeId: string, x: number, y: number) => void;
  onNodeClick?: (nodeId: string, event: MouseEvent) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeClick?: (edgeId: string, event: MouseEvent) => void;
  onEdgeHover?: (edgeId: string | null) => void;
  onTransformChange?: (transform: GraphTransform) => void;
}

const defaultConfig: InteractivityConfig = {
  enableDrag: true,
  enableZoom: true,
  enablePan: true,
  enableHover: true,
  enableSelection: true,
  zoomSpeed: 0.1,
  minZoom: 0.1,
  maxZoom: 5,
  panSpeed: 1,
};

export function useGraphInteractivity({
  nodes,
  config = {},
  onNodeDrag,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  onEdgeHover,
  onTransformChange,
}: UseGraphInteractivityProps) {
  const interactivityConfig = { ...defaultConfig, ...config };
  
  // Состояние интерактивности
  const [transform, setTransform] = useState<GraphTransform>({ x: 0, y: 0, k: 1 });
  const [selection, setSelection] = useState<GraphSelection>({ nodes: new Set(), edges: new Set() });
  const [hover, setHover] = useState<GraphHover>({});
  
  // Refs для отслеживания состояния
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<string | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  
  // Обработка начала перетаскивания узла
  const handleNodeDragStart = useCallback((nodeId: string, event: MouseEvent) => {
    if (!interactivityConfig.enableDrag) return;
    
    isDraggingRef.current = true;
    dragNodeRef.current = nodeId;
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    
    // Предотвращаем выделение текста
    event.preventDefault();
  }, [interactivityConfig.enableDrag]);
  
  // Обработка перетаскивания узла
  const handleNodeDrag = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current || !dragNodeRef.current) return;
    
    const deltaX = (event.clientX - lastMousePosRef.current.x) / transform.k;
    const deltaY = (event.clientY - lastMousePosRef.current.y) / transform.k;
    
    // Находим узел и обновляем его позицию
    const node = nodes.find(n => n.id === dragNodeRef.current);
    if (node && onNodeDrag) {
      const newX = (node.x || 0) + deltaX;
      const newY = (node.y || 0) + deltaY;
      onNodeDrag(dragNodeRef.current, newX, newY);
    }
    
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };
  }, [nodes, transform.k, onNodeDrag]);
  
  // Обработка окончания перетаскивания узла
  const handleNodeDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    dragNodeRef.current = null;
  }, []);
  
  // Обработка клика по узлу
  const handleNodeClick = useCallback((nodeId: string, event: MouseEvent) => {
    if (interactivityConfig.enableSelection) {
      setSelection(prev => {
        const newSelection = { ...prev };
        if (newSelection.nodes.has(nodeId)) {
          newSelection.nodes.delete(nodeId);
        } else {
          newSelection.nodes.add(nodeId);
        }
        return newSelection;
      });
    }
    
    if (onNodeClick) {
      onNodeClick(nodeId, event);
    }
  }, [interactivityConfig.enableSelection, onNodeClick]);
  
  // Обработка наведения на узел
  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (!interactivityConfig.enableHover) return;
    
    setHover(prev => ({ ...prev, node: nodeId || undefined }));
    
    if (onNodeHover) {
      onNodeHover(nodeId);
    }
  }, [interactivityConfig.enableHover, onNodeHover]);
  
  // Обработка клика по связи
  const handleEdgeClick = useCallback((edgeId: string, event: MouseEvent) => {
    if (interactivityConfig.enableSelection) {
      setSelection(prev => {
        const newSelection = { ...prev };
        if (newSelection.edges.has(edgeId)) {
          newSelection.edges.delete(edgeId);
        } else {
          newSelection.edges.add(edgeId);
        }
        return newSelection;
      });
    }
    
    if (onEdgeClick) {
      onEdgeClick(edgeId, event);
    }
  }, [interactivityConfig.enableSelection, onEdgeClick]);
  
  // Обработка наведения на связь
  const handleEdgeHover = useCallback((edgeId: string | null) => {
    if (!interactivityConfig.enableHover) return;
    
    setHover(prev => ({ ...prev, edge: edgeId || undefined }));
    
    if (onEdgeHover) {
      onEdgeHover(edgeId);
    }
  }, [interactivityConfig.enableHover, onEdgeHover]);
  
  // Обработка зума колесиком мыши
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!interactivityConfig.enableZoom) return;
    
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? -interactivityConfig.zoomSpeed : interactivityConfig.zoomSpeed;
    const newScale = Math.max(
      interactivityConfig.minZoom,
      Math.min(interactivityConfig.maxZoom, transform.k * (1 + delta))
    );
    
    // Масштабируем относительно позиции мыши
    const rect = (event.target as Element).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const newTransform = {
      x: transform.x - (mouseX - transform.x) * (newScale / transform.k - 1),
      y: transform.y - (mouseY - transform.y) * (newScale / transform.k - 1),
      k: newScale,
    };
    
    setTransform(newTransform);
    
    if (onTransformChange) {
      onTransformChange(newTransform);
    }
  }, [interactivityConfig, transform, onTransformChange]);
  
  // Обработка начала панорамирования
  const handlePanStart = useCallback((event: MouseEvent) => {
    if (!interactivityConfig.enablePan) return;
    
    isPanningRef.current = true;
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };
  }, [interactivityConfig.enablePan]);
  
  // Обработка панорамирования
  const handlePan = useCallback((event: MouseEvent) => {
    if (!isPanningRef.current) return;
    
    const deltaX = event.clientX - lastMousePosRef.current.x;
    const deltaY = event.clientY - lastMousePosRef.current.y;
    
    const newTransform = {
      x: transform.x + deltaX * interactivityConfig.panSpeed,
      y: transform.y + deltaY * interactivityConfig.panSpeed,
      k: transform.k,
    };
    
    setTransform(newTransform);
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    
    if (onTransformChange) {
      onTransformChange(newTransform);
    }
  }, [interactivityConfig, transform, onTransformChange]);
  
  // Обработка окончания панорамирования
  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
  }, []);
  
  // Сброс трансформации
  const resetTransform = useCallback(() => {
    const newTransform = { x: 0, y: 0, k: 1 };
    setTransform(newTransform);
    
    if (onTransformChange) {
      onTransformChange(newTransform);
    }
  }, [onTransformChange]);
  
  // Очистка выделения
  const clearSelection = useCallback(() => {
    setSelection({ nodes: new Set(), edges: new Set() });
  }, []);
  
  // Очистка наведения
  const clearHover = useCallback(() => {
    setHover({});
  }, []);
  
  return {
    // Состояние
    transform,
    selection,
    hover,
    
    // Обработчики событий
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragEnd,
    handleNodeClick,
    handleNodeHover,
    handleEdgeClick,
    handleEdgeHover,
    handleWheel,
    handlePanStart,
    handlePan,
    handlePanEnd,
    
    // Ссылки для проверки состояния
    isDraggingRef,
    isPanningRef,
    
    // Управление
    resetTransform,
    clearSelection,
    clearHover,
    
    // Конфигурация
    config: interactivityConfig,
  };
}