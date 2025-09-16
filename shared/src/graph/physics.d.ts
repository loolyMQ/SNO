import { GraphNode, GraphEdge, PhysicsConfig } from '../types';
export declare class GraphPhysics {
  private config;
  private nodes;
  private edges;
  private temperature;
  private frameCount;
  constructor(config: PhysicsConfig);
  setNodes(nodes: GraphNode[]): void;
  setEdges(edges: GraphEdge[]): void;
  updatePhysics(): void;
  private applyRepulsion;
  private applyAttraction;
  private applyGravity;
  private updatePositions;
  getNodes(): GraphNode[];
  getEdges(): GraphEdge[];
  getTemperature(): number;
  isStable(): boolean;
  reset(): void;
}
//# sourceMappingURL=physics.d.ts.map
