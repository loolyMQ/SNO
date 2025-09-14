// API типы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Graph типы
export interface GraphNode {
  id: string;
  label: string;
  type: 'institute' | 'department' | 'researcher' | 'topic' | 'category';
  properties?: Record<string, any>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'belongs_to' | 'collaborates_with' | 'researches' | 'related_to';
  weight?: number;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// User типы
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'researcher' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Search типы
export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  query: string;
  took: number;
}

// Job типы
export interface Job {
  id: string;
  type: 'EMAIL_SEND' | 'DATA_PROCESSING' | 'REPORT_GENERATION' | 'CLEANUP';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: Record<string, any>;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Kafka типы
export interface KafkaMessage<T = any> {
  topic: string;
  partition: number;
  offset: string;
  key?: string;
  value: T;
  timestamp: number;
  headers?: Record<string, string>;
}

export interface KafkaEvent {
  eventType: string;
  entityType: string;
  entityId: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}
