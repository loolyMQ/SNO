import { SpanKind } from '@opentelemetry/api';
export declare class TracingService {
    private static instance;
    private sdk;
    private tracer;
    static getInstance(): TracingService;
    initialize(serviceName: string, serviceVersion: string): void;
    createSpan(name: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
        correlationId?: string;
        userId?: string;
    }): import("@opentelemetry/api").Span;
    createChildSpan(parentSpan: {
        spanContext: () => {
            traceId: string;
            spanId: string;
        };
    }, name: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
    }): import("@opentelemetry/api").Span;
    addSpanAttributes(span: {
        setAttributes: (attrs: Record<string, string | number | boolean>) => void;
    }, attributes: Record<string, string | number | boolean>): void;
    addSpanEvent(span: {
        addEvent: (name: string, attrs?: Record<string, string | number | boolean>) => void;
    }, name: string, attributes?: Record<string, string | number | boolean>): void;
    setSpanError(span: {
        recordException: (error: Error) => void;
        setStatus: (status: {
            code: number;
            message?: string;
        }) => void;
    }, error: Error): void;
    finishSpan(span: {
        end: () => void;
    }): void;
    shutdown(): Promise<void>;
}
export declare const tracingMiddleware: (_serviceName: string) => (req: unknown, res: unknown, next: () => void) => void;
//# sourceMappingURL=tracing.d.ts.map