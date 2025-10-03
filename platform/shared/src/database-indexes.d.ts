export interface IIndexConfig {
    field: string;
    type: 'hash' | 'btree' | 'compound';
    unique: boolean;
    sparse: boolean;
    fields?: string[];
}
export interface IQueryStats {
    field: string;
    operation: string;
    executionTime: number;
    resultCount: number;
    timestamp: number;
    indexUsed: boolean;
}
export declare class DatabaseIndexManager<T = unknown> {
    private manager;
    private analyzer;
    private metrics;
    private logger;
    constructor(serviceName: string);
    createIndex(name: string, config: IIndexConfig): void;
    addToIndexes(document: T): void;
    removeFromIndexes(document: T): void;
    findByIndex(indexName: string, value: unknown): T[];
    findByCompoundIndex(indexName: string, values: {
        [field: string]: unknown;
    }): T[];
    analyzeIndex(indexName: string): import("./database/index-analyzer").IIndexAnalysis;
    analyzeAllIndexes(): import("./database/index-analyzer").IIndexAnalysis[];
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
    suggestIndexes(): string[];
    getPerformanceReport(): string;
    getMetrics(): Promise<string>;
    getIndexUsageStats(): Promise<{
        totalUsages: number;
        successRate: number;
        averageExecutionTime: number;
        slowQueries: number;
    }>;
    getAllIndexes(): string[];
    getIndexConfig(indexName: string): IIndexConfig | undefined;
    dropIndex(indexName: string): boolean;
    clearIndex(indexName: string): boolean;
    getIndexSize(indexName: string): number;
    clearStats(): void;
    getStatsCount(): number;
}
//# sourceMappingURL=database-indexes.d.ts.map