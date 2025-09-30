import pino from 'pino';
export interface IQueryStats {
    field: string;
    operation: string;
    executionTime: number;
    resultCount: number;
    timestamp: number;
    indexUsed: boolean;
}
export interface IIndexAnalysis {
    indexName: string;
    usageCount: number;
    averageExecutionTime: number;
    hitRate: number;
    recommendations: string[];
    efficiency: 'high' | 'medium' | 'low';
}
export declare class IndexAnalyzer {
    private queryStats;
    private maxStatsEntries;
    private logger;
    constructor(maxStatsEntries: number | undefined, logger: pino.Logger);
    recordQuery(field: string, operation: string, executionTime: number, resultCount: number, indexUsed: boolean): void;
    analyzeIndex(indexName: string): IIndexAnalysis;
    analyzeAllIndexes(): IIndexAnalysis[];
    getSlowQueries(threshold?: number): IQueryStats[];
    getQueryPatterns(): {
        mostUsedFields: Array<{
            field: string;
            count: number;
        }>;
        slowestOperations: Array<{
            operation: string;
            avgTime: number;
        }>;
        indexUtilization: number;
    };
    suggestIndexes(existingIndexes: string[]): string[];
    getPerformanceReport(): string;
    private generateRecommendations;
    private calculateEfficiency;
    clearStats(): void;
    getStatsCount(): number;
}
//# sourceMappingURL=index-analyzer.d.ts.map