import { useCallback, useRef, useEffect, useState, useMemo } from 'react';

export interface VirtualizationConfig {
  maxVisibleNodes: number;
  maxVisibleEdges: number;
  viewportMargin: number;
  enableClustering: boolean;
  clusterThreshold: number;
  enableLevelOfDetail: boolean;
  lodThresholds: {
    high: number;
    medium: number;
    low: number;
  };
  enableSpatialIndexing: boolean;
  spatialGridSize: number;
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface SpatialGrid {
  cellSize: number;
  cells: Map<string, string[]>; // cellId -> nodeIds
}

export interface NodeCluster {
  id: string;
  nodes: string[];
  centerX: number;
  centerY: number;
  radius: number;
  level: number;
  representativeNode?: any;
}

const defaultConfig: VirtualizationConfig = {
  maxVisibleNodes: 1000,
  maxVisibleEdges: 2000,
  viewportMargin: 100,
  enableClustering: true,
  clusterThreshold: 500,
  enableLevelOfDetail: true,
  lodThresholds: {
    high: 1.0,
    medium: 0.5,
    low: 0.1,
  },
  enableSpatialIndexing: true,
  spatialGridSize: 100,
};

export function useGraphVirtualization(
  nodes: any[],
  edges: any[],
  viewportBounds: ViewportBounds,
  config: Partial<VirtualizationConfig> = {}
) {
  const virtualizationConfig = { ...defaultConfig, ...config };
  
  // Состояние виртуализации
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [visibleEdges, setVisibleEdges] = useState<Set<string>>(new Set());
  const [nodeClusters, setNodeClusters] = useState<NodeCluster[]>([]);
  const [spatialGrid, setSpatialGrid] = useState<SpatialGrid | null>(null);
  const [lodLevel, setLodLevel] = useState<'high' | 'medium' | 'low'>('high');

  // Рефы для кэширования
  const lastViewportRef = useRef<ViewportBounds>(viewportBounds);
  const lastNodesRef = useRef<any[]>(nodes);
  const lastEdgesRef = useRef<any[]>(edges);
  const spatialIndexRef = useRef<Map<string, string[]>>(new Map());

  // Создание пространственного индекса
  const createSpatialIndex = useCallback((nodeList: any[]) => {
    if (!virtualizationConfig.enableSpatialIndexing) return null;

    const gridSize = virtualizationConfig.spatialGridSize;
    const grid = new Map<string, string[]>();

    nodeList.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        const cellX = Math.floor(node.x / gridSize);
        const cellY = Math.floor(node.y / gridSize);
        const cellId = `${cellX},${cellY}`;
        
        if (!grid.has(cellId)) {
          grid.set(cellId, []);
        }
        grid.get(cellId)!.push(node.id);
      }
    });

    return {
      cellSize: gridSize,
      cells: grid,
    };
  }, [virtualizationConfig]);

  // Кластеризация узлов
  const clusterNodes = useCallback((
    nodeList: any[],
    edgeList: any[],
    viewport: ViewportBounds
  ) => {
    if (!virtualizationConfig.enableClustering || 
        nodeList.length < virtualizationConfig.clusterThreshold) {
      return [];
    }

    const clusters: NodeCluster[] = [];
    const clusterSize = Math.ceil(nodeList.length / virtualizationConfig.maxVisibleNodes);
    const gridSize = Math.ceil(Math.sqrt(virtualizationConfig.maxVisibleNodes));
    
    // Создаем сетку кластеров
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const clusterId = `cluster_${i}_${j}`;
        const centerX = (i + 0.5) * (viewport.width / gridSize);
        const centerY = (j + 0.5) * (viewport.height / gridSize);
        
        clusters.push({
          id: clusterId,
          nodes: [],
          centerX,
          centerY,
          radius: Math.min(viewport.width, viewport.height) / (gridSize * 2),
          level: 0,
        });
      }
    }

    // Распределяем узлы по кластерам
    nodeList.forEach((node, index) => {
      const clusterIndex = Math.floor(index / clusterSize);
      if (clusterIndex < clusters.length) {
        clusters[clusterIndex].nodes.push(node.id);
      }
    });

    // Создаем представительные узлы для кластеров
    clusters.forEach(cluster => {
      if (cluster.nodes.length > 0) {
        const representativeNode = nodeList.find(n => cluster.nodes.includes(n.id));
        if (representativeNode) {
          cluster.representativeNode = {
            ...representativeNode,
            id: cluster.id,
            label: `Кластер (${cluster.nodes.length})`,
            type: 'cluster',
            x: cluster.centerX,
            y: cluster.centerY,
          };
        }
      }
    });

    return clusters.filter(cluster => cluster.nodes.length > 0);
  }, [virtualizationConfig]);

  // Определение уровня детализации
  const determineLODLevel = useCallback((scale: number) => {
    if (!virtualizationConfig.enableLevelOfDetail) return 'high';

    if (scale >= virtualizationConfig.lodThresholds.high) {
      return 'high';
    } else if (scale >= virtualizationConfig.lodThresholds.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }, [virtualizationConfig]);

  // Определение видимых узлов с использованием пространственного индекса
  const getVisibleNodesWithSpatialIndex = useCallback((
    nodeList: any[],
    viewport: ViewportBounds,
    grid: SpatialGrid
  ) => {
    const visible = new Set<string>();
    const margin = virtualizationConfig.viewportMargin;
    
    // Определяем ячейки сетки, которые пересекаются с viewport
    const minCellX = Math.floor((viewport.x - margin) / grid.cellSize);
    const maxCellX = Math.ceil((viewport.x + viewport.width + margin) / grid.cellSize);
    const minCellY = Math.floor((viewport.y - margin) / grid.cellSize);
    const maxCellY = Math.ceil((viewport.y + viewport.height + margin) / grid.cellSize);
    
    // Проверяем узлы в пересекающихся ячейках
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        const cellId = `${cellX},${cellY}`;
        const nodeIds = grid.cells.get(cellId);
        
        if (nodeIds) {
          nodeIds.forEach(nodeId => {
            const node = nodeList.find(n => n.id === nodeId);
            if (node && node.x !== undefined && node.y !== undefined) {
              const screenX = (node.x - viewport.x) * viewport.scale;
              const screenY = (node.y - viewport.y) * viewport.scale;
              
              if (
                screenX >= -margin &&
                screenX <= viewport.width + margin &&
                screenY >= -margin &&
                screenY <= viewport.height + margin
              ) {
                visible.add(nodeId);
              }
            }
          });
        }
      }
    }
    
    return visible;
  }, [virtualizationConfig]);

  // Определение видимых узлов без пространственного индекса
  const getVisibleNodesWithoutSpatialIndex = useCallback((
    nodeList: any[],
    viewport: ViewportBounds
  ) => {
    const visible = new Set<string>();
    const margin = virtualizationConfig.viewportMargin;
    
    nodeList.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        const screenX = (node.x - viewport.x) * viewport.scale;
        const screenY = (node.y - viewport.y) * viewport.scale;
        
        if (
          screenX >= -margin &&
          screenX <= viewport.width + margin &&
          screenY >= -margin &&
          screenY <= viewport.height + margin
        ) {
          visible.add(node.id);
        }
      }
    });
    
    return visible;
  }, [virtualizationConfig]);

  // Определение видимых связей
  const getVisibleEdges = useCallback((
    edgeList: any[],
    visibleNodeIds: Set<string>
  ) => {
    const visible = new Set<string>();
    
    edgeList.forEach(edge => {
      const sourceVisible = visibleNodeIds.has(edge.source);
      const targetVisible = visibleNodeIds.has(edge.target);
      
      if (sourceVisible || targetVisible) {
        visible.add(edge.id);
      }
    });
    
    return visible;
  }, []);

  // Основная функция виртуализации
  const virtualizeGraph = useCallback(() => {
    const currentLOD = determineLODLevel(viewportBounds.scale);
    setLodLevel(currentLOD);

    let visibleNodeIds: Set<string>;
    let visibleEdgeIds: Set<string>;
    let clusters: NodeCluster[] = [];

    // Применяем кластеризацию если нужно
    if (virtualizationConfig.enableClustering && 
        nodes.length > virtualizationConfig.clusterThreshold) {
      clusters = clusterNodes(nodes, edges, viewportBounds);
      setNodeClusters(clusters);
      
      // Используем представительные узлы кластеров
      const representativeNodes = clusters
        .map(c => c.representativeNode)
        .filter(Boolean);
      
      if (spatialGrid) {
        visibleNodeIds = getVisibleNodesWithSpatialIndex(
          representativeNodes,
          viewportBounds,
          spatialGrid
        );
      } else {
        visibleNodeIds = getVisibleNodesWithoutSpatialIndex(
          representativeNodes,
          viewportBounds
        );
      }
    } else {
      // Обычная виртуализация
      if (spatialGrid) {
        visibleNodeIds = getVisibleNodesWithSpatialIndex(
          nodes,
          viewportBounds,
          spatialGrid
        );
      } else {
        visibleNodeIds = getVisibleNodesWithoutSpatialIndex(
          nodes,
          viewportBounds
        );
      }
    }

    // Ограничиваем количество видимых узлов
    if (visibleNodeIds.size > virtualizationConfig.maxVisibleNodes) {
      const limitedVisible = new Set<string>();
      let count = 0;
      
      for (const nodeId of visibleNodeIds) {
        if (count >= virtualizationConfig.maxVisibleNodes) break;
        limitedVisible.add(nodeId);
        count++;
      }
      
      visibleNodeIds = limitedVisible;
    }

    // Определяем видимые связи
    visibleEdgeIds = getVisibleEdges(edges, visibleNodeIds);
    
    // Ограничиваем количество видимых связей
    if (visibleEdgeIds.size > virtualizationConfig.maxVisibleEdges) {
      const limitedVisible = new Set<string>();
      let count = 0;
      
      for (const edgeId of visibleEdgeIds) {
        if (count >= virtualizationConfig.maxVisibleEdges) break;
        limitedVisible.add(edgeId);
        count++;
      }
      
      visibleEdgeIds = limitedVisible;
    }

    setVisibleNodes(visibleNodeIds);
    setVisibleEdges(visibleEdgeIds);
  }, [
    nodes,
    edges,
    viewportBounds,
    spatialGrid,
    virtualizationConfig,
    determineLODLevel,
    clusterNodes,
    getVisibleNodesWithSpatialIndex,
    getVisibleNodesWithoutSpatialIndex,
    getVisibleEdges,
  ]);

  // Создание пространственного индекса при изменении узлов
  useEffect(() => {
    if (virtualizationConfig.enableSpatialIndexing) {
      const newSpatialGrid = createSpatialIndex(nodes);
      setSpatialGrid(newSpatialGrid);
    }
  }, [nodes, createSpatialIndex, virtualizationConfig.enableSpatialIndexing]);

  // Обновление виртуализации при изменении данных или viewport
  useEffect(() => {
    const viewportChanged = 
      lastViewportRef.current.x !== viewportBounds.x ||
      lastViewportRef.current.y !== viewportBounds.y ||
      lastViewportRef.current.width !== viewportBounds.width ||
      lastViewportRef.current.height !== viewportBounds.height ||
      lastViewportRef.current.scale !== viewportBounds.scale;

    const dataChanged = 
      lastNodesRef.current !== nodes ||
      lastEdgesRef.current !== edges;

    if (viewportChanged || dataChanged) {
      virtualizeGraph();
      
      lastViewportRef.current = viewportBounds;
      lastNodesRef.current = nodes;
      lastEdgesRef.current = edges;
    }
  }, [virtualizeGraph, viewportBounds, nodes, edges]);

  // Оптимизированные данные для рендеринга
  const optimizedData = useMemo(() => {
    const visibleNodesList = nodes.filter(node => visibleNodes.has(node.id));
    const visibleEdgesList = edges.filter(edge => visibleEdges.has(edge.id));
    
    return {
      nodes: visibleNodesList,
      edges: visibleEdgesList,
      clusters: nodeClusters,
      lodLevel,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      visibleNodesCount: visibleNodes.size,
      visibleEdgesCount: visibleEdges.size,
    };
  }, [nodes, edges, visibleNodes, visibleEdges, nodeClusters, lodLevel]);

  // Функции для управления виртуализацией
  const expandCluster = useCallback((clusterId: string) => {
    const cluster = nodeClusters.find(c => c.id === clusterId);
    if (cluster) {
      // Добавляем узлы кластера к видимым
      const newVisibleNodes = new Set(visibleNodes);
      cluster.nodes.forEach(nodeId => newVisibleNodes.add(nodeId));
      setVisibleNodes(newVisibleNodes);
      
      // Удаляем кластер из списка
      setNodeClusters(prev => prev.filter(c => c.id !== clusterId));
    }
  }, [nodeClusters, visibleNodes]);

  const collapseCluster = useCallback((nodeIds: string[]) => {
    // Создаем новый кластер из выбранных узлов
    const clusterId = `cluster_${Date.now()}`;
    const centerX = nodeIds.reduce((sum, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      return sum + (node?.x || 0);
    }, 0) / nodeIds.length;
    
    const centerY = nodeIds.reduce((sum, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      return sum + (node?.y || 0);
    }, 0) / nodeIds.length;

    const newCluster: NodeCluster = {
      id: clusterId,
      nodes: nodeIds,
      centerX,
      centerY,
      radius: 50,
      level: 0,
    };

    setNodeClusters(prev => [...prev, newCluster]);
    
    // Удаляем узлы из видимых
    const newVisibleNodes = new Set(visibleNodes);
    nodeIds.forEach(nodeId => newVisibleNodes.delete(nodeId));
    setVisibleNodes(newVisibleNodes);
  }, [nodes, visibleNodes]);

  return {
    // Оптимизированные данные
    optimizedData,
    
    // Состояние виртуализации
    visibleNodes,
    visibleEdges,
    nodeClusters,
    spatialGrid,
    lodLevel,
    
    // Функции управления
    expandCluster,
    collapseCluster,
    virtualizeGraph,
    
    // Конфигурация
    config: virtualizationConfig,
  };
}

