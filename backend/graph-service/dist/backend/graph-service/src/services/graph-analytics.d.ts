import { DIContainer } from '@science-map/shared';
export interface IGraphAnalytics {
    calculateCentrality(graphId: string): Promise<Record<string, number>>;
    findShortestPath(sourceId: string, targetId: string): Promise<string[]>;
    detectCommunities(graphId: string): Promise<Record<string, string[]>>;
    analyzeCollaborationPatterns(userId: string): Promise<unknown>;
}
export declare class GraphAnalytics implements IGraphAnalytics {
    constructor(_container: DIContainer);
    calculateCentrality(_graphId: string): Promise<Record<string, number>>;
    findShortestPath(sourceId: string, targetId: string): Promise<string[]>;
    detectCommunities(_graphId: string): Promise<Record<string, string[]>>;
    analyzeCollaborationPatterns(_userId: string): Promise<unknown>;
}
//# sourceMappingURL=graph-analytics.d.ts.map