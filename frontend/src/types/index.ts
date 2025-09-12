export interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'author' | 'institution' | 'paper';
  x: number;
  y: number;
  size?: number;
  color?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'related_to' | 'authored_by' | 'belongs_to' | 'cites';
  weight: number;
  color?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

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

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  temperature: number;
  isStable: boolean;
  isSimulating: boolean;
}
