export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  position?: {
    x: number;
    y: number;
  };
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  properties: Record<string, unknown>;
  weight?: number;
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Graph {
  id: string;
  name: string;
  description?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface GraphMetadata {
  author: string;
  tags: string[];
  category: string;
  visibility: 'public' | 'private' | 'shared';
  license?: string;
  source?: string;
  citations?: string[];
}

export interface GraphLayout {
  id: string;
  graphId: string;
  name: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  positions: Record<string, { x: number; y: number }>;
  createdAt: Date;
}

export interface GraphAnalysis {
  graphId: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  clusteringCoefficient: number;
  averagePathLength: number;
  diameter: number;
  components: number;
  isConnected: boolean;
  isDirected: boolean;
  createdAt: Date;
}

export interface GraphQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  parameters: Record<string, unknown>;
  result: GraphQueryResult;
  executedAt: Date;
  executionTime: number;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    nodeCount: number;
    edgeCount: number;
    executionTime: number;
  };
}

export interface GraphTraversal {
  id: string;
  graphId: string;
  startNode: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  path: string[];
  visited: string[];
  result: unknown;
  createdAt: Date;
}

export interface GraphCommunity {
  id: string;
  graphId: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  communities: Array<{
    id: string;
    nodes: string[];
    modularity: number;
  }>;
  modularity: number;
  createdAt: Date;
}

export interface GraphMetrics {
  graphId: string;
  nodeMetrics: Record<string, number>;
  edgeMetrics: Record<string, number>;
  globalMetrics: Record<string, number>;
  calculatedAt: Date;
}
