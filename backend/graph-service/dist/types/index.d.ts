export interface GraphNode {
    id: string;
    label: string;
    type: 'concept' | 'topic' | 'subtopic';
    properties: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: 'related' | 'contains' | 'depends';
    weight: number;
    properties: Record<string, unknown>;
    createdAt: number;
}
export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: {
        totalNodes: number;
        totalEdges: number;
        lastUpdated: number;
    };
}
//# sourceMappingURL=index.d.ts.map