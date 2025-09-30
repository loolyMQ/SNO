import { Pool } from 'pg';
import pino from 'pino';
export interface IQueryPlan {
    planRows: number;
    planCost: number;
    actualRows?: number;
    actualTime?: number;
    indexScans?: string[];
    seqScans?: string[];
    joins?: string[];
    sorts?: string[];
}
export interface IQueryAnalysis {
    query: string;
    executionTime: number;
    planCost: number;
    rowsReturned: number;
    indexesUsed: string[];
    recommendations: string[];
    optimizationLevel: 'excellent' | 'good' | 'poor' | 'critical';
}
export declare class QueryAnalyzer {
    private pool;
    private logger;
    constructor(pool: Pool, logger: pino.Logger);
    analyzeQuery(query: string, params?: unknown[]): Promise<IQueryAnalysis>;
    private shouldUseExplainAnalyze;
    private extractIndexScans;
    private extractSeqScans;
    private extractJoins;
    private extractSorts;
    private traversePlan;
    private generateRecommendations;
    private calculateOptimizationLevel;
}
//# sourceMappingURL=query-analyzer.d.ts.map