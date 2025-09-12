// Общие типы для всего проекта

export interface GraphNode {
  id: string;
  label: string;
  type: 'paper' | 'author' | 'institution' | 'topic';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'cites' | 'authored_by' | 'belongs_to' | 'related_to';
  weight?: number;
  metadata?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Физика графа
export interface PhysicsConfig {
  repulsion: number;
  attraction: number;
  gravity: number;
  damping: number;
  naturalLinkLength: number;
  maxLinkStretch: number;
  minLinkLength: number;
  springStiffness: number;
  springDamping: number;
  initialTemperature: number;
  minTemperature: number;
  coolingRate: number;
  adaptiveFPS: boolean;
  targetFPS: number;
  maxFPS: number;
  minFPS: number;
}

// Kafka события
export interface KafkaEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  source: string;
}

export interface GraphUpdateEvent extends KafkaEvent {
  type: 'graph.update';
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface SearchEvent extends KafkaEvent {
  type: 'search.query';
  data: {
    query: string;
    filters?: Record<string, any>;
  };
}

// API типы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SearchRequest {
  query: string;
  filters?: {
    type?: string[];
    year?: { from: number; to: number };
    authors?: string[];
    institutions?: string[];
  };
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  results: GraphData;
  total: number;
  query: string;
  executionTime: number;
}

// Конфигурация сервисов
export interface ServiceConfig {
  port: number;
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  database?: {
    url: string;
  };
  redis?: {
    url: string;
  };
}
