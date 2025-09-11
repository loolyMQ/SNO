// Типы для графа
export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  type?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  type?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Типы для физики
export interface PhysicsConfig {
  damping: number;
  gravity: number;
  maxVelocity: number;
  area: number;
  initialTemperature: number;
  coolingRate: number;
  minTemperature: number;
  maxDisplacement: number;
  springLength: number;
  maxLinkLength: number;
  maxDisplacement?: number;
  repulsionMultiplier?: number;
  attractionMultiplier?: number;
  algorithm?: 'fruchterman-reingold' | 'openord' | 'hybrid';
  isRunning?: boolean;
}

export interface PhysicsState {
  positions: Map<string, { x: number; y: number }>;
  velocities: Map<string, { vx: number; vy: number }>;
  temperature: number;
  phase: 'liquid' | 'expansion' | 'cooldown' | 'crunch' | 'simmer';
  isRunning: boolean;
  currentAlgorithm: 'fruchterman-reingold' | 'openord' | 'hybrid';
}

// Типы для интерактивности
export interface InteractivityConfig {
  enableDrag: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableHover: boolean;
  hoverRadius?: number;
}

export interface InteractivityState {
  isDragging: boolean;
  isPanning: boolean;
  draggedNode: string | null;
  zoom: number;
  panX: number;
  panY: number;
  hoveredNode: string | null;
}

// Типы для рендеринга
export interface RenderConfig {
  nodeRadius: number;
  edgeWidth: number;
  backgroundColor: string;
  nodeColor: string;
  edgeColor: string;
  showLabels: boolean;
  showMetrics: boolean;
}

// Типы для метрик
export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  fps: number;
  temperature: number;
  algorithm: string;
  phase: string;
}