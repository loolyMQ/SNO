import { DIContainer } from '@science-map/shared';
import { IGraphRepository, IGraph, INode, IEdge } from '../types';
import { IGraphAnalytics } from './graph-analytics';
export declare class GraphService {
    private container;
    private graphRepository?;
    private graphAnalytics?;
    constructor(container: DIContainer, graphRepository?: IGraphRepository | undefined, graphAnalytics?: IGraphAnalytics | undefined);
    initialize(): Promise<void>;
    getUserGraph(userId: string): Promise<IGraph>;
    createNode(nodeData: Omit<INode, 'id' | 'createdAt' | 'updatedAt'>): Promise<INode>;
    createEdge(edgeData: Omit<IEdge, 'id' | 'createdAt'>): Promise<IEdge>;
    getGraphAnalytics(userId: string): Promise<unknown>;
    getStatistics(): Promise<{
        nodeCount: number;
        edgeCount: number;
    }>;
}
//# sourceMappingURL=graph-service.d.ts.map