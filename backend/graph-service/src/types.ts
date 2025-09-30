export interface INode {
  id: string;
  type: 'user' | 'research' | 'institution' | 'publication';
  label: string;
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'collaborates' | 'publishes' | 'cites' | 'belongs_to';
  weight: number;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface IGraph {
  nodes: INode[];
  edges: IEdge[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    lastUpdated: Date;
  };
}

export interface IGraphRepository {
  createNode(node: Omit<INode, 'id' | 'createdAt' | 'updatedAt'>): Promise<INode>;
  createEdge(edge: Omit<IEdge, 'id' | 'createdAt'>): Promise<IEdge>;
  getNode(id: string): Promise<INode | null>;
  getEdge(id: string): Promise<IEdge | null>;
  getUserGraph(userId: string): Promise<IGraph>;
  updateNodeProperties(nodeId: string, properties: Record<string, unknown>): Promise<void>;
  deleteNode(nodeId: string): Promise<void>;
  getGraphStatistics(): Promise<{ nodeCount: number; edgeCount: number }>; 
}

export interface IGraphAnalytics {
  calculateCentrality(graphId: string): Promise<Record<string, number>>;
  findShortestPath(sourceId: string, targetId: string): Promise<string[]>;
  detectCommunities(graphId: string): Promise<Record<string, string[]>>;
  analyzeCollaborationPatterns(userId: string): Promise<unknown>;
}

export interface IEventProcessor {
  processUserRegistered(event: unknown): Promise<void>;
  processUserLogin(event: unknown): Promise<void>;
}


