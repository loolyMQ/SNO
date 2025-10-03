import { Span } from '@opentelemetry/api';
export interface ITraceContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    operation: string;
    service: string;
    timestamp: number;
}
export interface ISpanData {
    operationName: string;
    tags?: Record<string, unknown>;
    duration?: number;
    status?: 'success' | 'error';
    error?: Error;
}
export interface ITracingConfig {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    jaegerEndpoint?: string | undefined;
    otlpEndpoint?: string | undefined;
    enableConsoleExporter?: boolean;
    sampleRate?: number;
}
export interface IHttpTraceData {
    method: string;
    url: string;
    statusCode: number;
    userAgent?: string;
    ip?: string;
    userId?: string;
    duration: number;
}
export interface IKafkaTraceData {
    topic: string;
    operation: 'produce' | 'consume';
    partition?: number;
    offset?: number;
    messageSize?: number;
    duration: number;
}
export interface IDatabaseTraceData {
    operation: string;
    table?: string;
    query?: string;
    rowsAffected?: number;
    duration: number;
}
export declare class TracingManager {
    private tracer;
    private config;
    private sdk?;
    private logger;
    constructor(config: ITracingConfig);
    private initializeTracing;
    private createTraceExporters;
    startSpan(name: string, options?: Record<string, unknown>): Span;
    startChildSpan(name: string, _parentSpan: Span, options?: Record<string, unknown>): Span;
    traceFunction<T>(name: string, fn: (span: Span) => Promise<T>, options?: Record<string, unknown>): Promise<T>;
    traceHttpRequest(data: IHttpTraceData): Span;
    traceKafkaOperation(data: IKafkaTraceData): Span;
    traceDatabaseOperation(data: IDatabaseTraceData): Span;
    getCurrentTraceContext(): ITraceContext | null;
    addAttributes(attributes: Record<string, unknown>): void;
    addEvent(name: string, attributes?: Record<string, unknown>): void;
    shutdown(): Promise<void>;
}
export declare function createTracingMiddleware(tracingManager: TracingManager): (req: unknown, res: unknown, next: () => void) => void;
export declare function Trace(operationName?: string): (target: object, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare let globalTracingManager: TracingManager | null;
export declare class TracingFactory {
    static create(config: Partial<ITracingConfig> & {
        serviceName: string;
    }): TracingManager;
    static createForService(serviceName: string): TracingManager;
}
export declare const TracingUtils: {
    extractTraceFromHeaders(headers: Record<string, string>): string | null;
    injectTraceToHeaders(headers: Record<string, string>, traceContext: ITraceContext): void;
    createCorrelationId(): string;
    formatTraceForLogs(traceContext: ITraceContext | null): Record<string, unknown>;
};
//# sourceMappingURL=tracing.d.ts.map