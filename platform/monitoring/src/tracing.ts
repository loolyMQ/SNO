import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';

export class TracingService {
  private tracer = trace.getTracer('science-map-tracer');

  public createSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
    return this.tracer.startSpan(name, attributes ? { attributes } : {});
  }

  public addEvent(span: Span, name: string, attributes?: Record<string, string | number | boolean>): void {
    span.addEvent(name, attributes);
  }

  public setStatus(span: Span, code: 'ok' | 'error', message?: string): void {
    span.setStatus({
      code: code === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR,
      message
    });
  }

  public endSpan(span: Span): void {
    span.end();
  }

  public runInContext<T>(span: Span, fn: () => T): T {
    return context.with(trace.setSpan(context.active(), span), fn);
  }

  public createChildSpan(parentSpan: Span, name: string, attributes?: Record<string, string | number | boolean>): Span {
    return this.tracer.startSpan(name, {
      ...(attributes && { attributes }),
      kind: 1 // SpanKind.INTERNAL
    }, trace.setSpan(context.active(), parentSpan));
  }
}

export const createTracingService = (): TracingService => {
  return new TracingService();
};
