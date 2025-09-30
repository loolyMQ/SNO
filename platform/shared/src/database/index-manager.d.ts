import pino from 'pino';
export interface IIndexConfig {
    field: string;
    type: 'hash' | 'btree' | 'compound';
    unique: boolean;
    sparse: boolean;
    fields?: string[];
}
export declare class IndexManager<T = any> {
    private indexes;
    private compoundIndexes;
    private indexConfigs;
    private logger;
    constructor(_serviceName: string, logger: pino.Logger);
    createIndex(name: string, config: IIndexConfig): void;
    addToIndexes(document: T): void;
    removeFromIndexes(document: T): void;
    findByIndex(indexName: string, value: unknown): T[];
    findByCompoundIndex(indexName: string, values: {
        [field: string]: unknown;
    }): T[];
    getAllIndexes(): string[];
    getIndexConfig(indexName: string): IIndexConfig | undefined;
    dropIndex(indexName: string): boolean;
    clearIndex(indexName: string): boolean;
    getIndexSize(indexName: string): number;
    private addToSingleIndex;
    private addToCompoundIndex;
    private removeFromSingleIndex;
    private removeFromCompoundIndex;
    private getFieldValue;
}
//# sourceMappingURL=index-manager.d.ts.map