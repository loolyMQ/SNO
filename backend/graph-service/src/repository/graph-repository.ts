import { IGraphRepository, INode, IEdge } from '../types';
import { nodeCount, edgeCount } from '../metrics';

export class GraphRepository implements IGraphRepository {
  private nodes: Map<string, INode> = new Map();
  private edges: Map<string, IEdge> = new Map();
  // private userGraphs: Map<string, string[]> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const testNodes: INode[] = [
      {
        id: 'node-1',
        type: 'research',
        label: 'Квантовая механика',
        properties: { field: 'physics', complexity: 'high' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'node-2',
        type: 'research',
        label: 'Машинное обучение',
        properties: { field: 'computer_science', complexity: 'medium' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'node-3',
        type: 'institution',
        label: 'MIT',
        properties: { type: 'university', country: 'USA' },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    testNodes.forEach(node => this.nodes.set(node.id, node));

    const testEdges: IEdge[] = [
      {
        id: 'edge-1',
        sourceId: 'node-1',
        targetId: 'node-2',
        type: 'cites',
        weight: 0.8,
        properties: { citations: 15 },
        createdAt: new Date()
      },
      {
        id: 'edge-2',
        sourceId: 'node-1',
        targetId: 'node-3',
        type: 'belongs_to',
        weight: 1.0,
        properties: { department: 'Physics' },
        createdAt: new Date()
      }
    ];

    testEdges.forEach(edge => this.edges.set(edge.id, edge));
  }

  async createNode(nodeData: Omit<INode, 'id' | 'createdAt' | 'updatedAt'>): Promise<INode> {
    const node: INode = {
      ...nodeData,
      id: `node-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.nodes.set(node.id, node);
    nodeCount.inc({ type: node.type });
    return node;
  }

  async createEdge(edgeData: Omit<IEdge, 'id' | 'createdAt'>): Promise<IEdge> {
    const edge: IEdge = {
      ...edgeData,
      id: `edge-${Date.now()}`,
      createdAt: new Date()
    };

    this.edges.set(edge.id, edge);
    edgeCount.inc({ type: edge.type });
    return edge;
  }

  async getNode(id: string): Promise<INode | null> {
    return this.nodes.get(id) || null;
  }

  async getEdge(id: string): Promise<IEdge | null> {
    return this.edges.get(id) || null;
  }

  async getUserGraph(_userId: string): Promise<{ nodes: INode[]; edges: IEdge[]; metadata: { nodeCount: number; edgeCount: number; lastUpdated: Date } }> {
    const nodes = Array.from(this.nodes.values());
    const edges = Array.from(this.edges.values());
    return {
      nodes,
      edges,
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        lastUpdated: new Date()
      }
    };
  }

  async updateNodeProperties(nodeId: string, properties: Record<string, unknown>): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.properties = { ...node.properties, ...properties } as Record<string, unknown>;
      node.updatedAt = new Date();
      this.nodes.set(nodeId, node);
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    this.nodes.delete(nodeId);
    for (const [edgeId, edge] of this.edges) {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        this.edges.delete(edgeId);
      }
    }
  }

  async getGraphStatistics(): Promise<{ nodeCount: number; edgeCount: number }> {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size
    };
  }
}


