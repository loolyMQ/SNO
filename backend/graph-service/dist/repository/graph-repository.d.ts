import { IGraphRepository, INode, IEdge } from '../types';
export declare class GraphRepository implements IGraphRepository {
    private nodes;
    private edges;
    private userGraphs;
    constructor();
    private initializeSampleData;
    createNode(nodeData: Omit<INode, 'id' | 'createdAt' | 'updatedAt'>): Promise<INode>;
    createEdge(edgeData: Omit<IEdge, 'id' | 'createdAt'>): Promise<IEdge>;
    getNode(id: string): Promise<INode | null>;
    getEdge(id: string): Promise<IEdge | null>;
    getUserGraph(_userId: string): Promise<{
        nodes: INode[];
        edges: IEdge[];
        metadata: {
            nodeCount: number;
            edgeCount: number;
            lastUpdated: Date;
        };
    }>;
    updateNodeProperties(nodeId: string, properties: Record<string, unknown>): Promise<void>;
    deleteNode(nodeId: string): Promise<void>;
    getGraphStatistics(): Promise<{
        nodeCount: number;
        edgeCount: number;
    }>;
}
//# sourceMappingURL=graph-repository.d.ts.map