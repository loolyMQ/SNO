import { TracingManager, IDatabaseTraceData } from './tracing';
export interface ITracedDatabaseOperation {
    query: string;
    params?: unknown[];
    operation: string;
    table?: string;
    startTime: number;
}
export declare class DatabaseTracing {
    private tracingManager;
    constructor(tracingManager: TracingManager);
    traceQuery<T>(operation: string, query: string, params: unknown[] | undefined, executor: () => Promise<T>): Promise<T>;
    traceSelect<T>(query: string, params: unknown[] | undefined, executor: () => Promise<T>): Promise<T>;
    traceInsert<T>(query: string, params: unknown[] | undefined, executor: () => Promise<T>): Promise<T>;
    traceUpdate<T>(query: string, params: unknown[] | undefined, executor: () => Promise<T>): Promise<T>;
    traceDelete<T>(query: string, params: unknown[] | undefined, executor: () => Promise<T>): Promise<T>;
    traceTransaction<T>(name: string, executor: () => Promise<T>): Promise<T>;
    private extractTableFromQuery;
    private sanitizeQuery;
    private analyzeQueryResult;
    private getConnectionString;
}
export declare abstract class TracedRepository {
    protected tracingManager: TracingManager;
    protected dbTracing: DatabaseTracing;
    constructor(tracingManager: TracingManager);
    protected findById<T>(id: string | number, table: string, executor: () => Promise<T>): Promise<T>;
    protected findAll<T>(table: string, executor: () => Promise<T>): Promise<T>;
    protected create<T>(data: Record<string, unknown>, table: string, executor: () => Promise<T>): Promise<T>;
    protected update<T>(id: string | number, data: Record<string, unknown>, table: string, executor: () => Promise<T>): Promise<T>;
    protected delete<T>(id: string | number, table: string, executor: () => Promise<T>): Promise<T>;
}
export declare function DatabaseTrace(operation?: string, table?: string): (_target: object, _propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const DatabaseTracingUtils: {
    createDatabaseTraceContext(tracingManager: TracingManager, operation: string, table?: string): Record<string, unknown>;
    isSlowQuery(duration: number, operation: string): boolean;
    formatDatabaseTraceForLogs(operation: IDatabaseTraceData): Record<string, unknown>;
};
//# sourceMappingURL=database-tracing.d.ts.map