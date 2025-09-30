import express from 'express';
export declare function setupRoutes(app: express.Application, graphService: {
    getStatistics: () => Promise<{
        nodeCount: number;
        edgeCount: number;
    }>;
    getUserGraph: (userId: string) => Promise<unknown>;
    getGraphAnalytics: (userId: string) => Promise<unknown>;
}): void;
//# sourceMappingURL=routes.d.ts.map