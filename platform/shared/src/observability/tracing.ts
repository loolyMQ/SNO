import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { CorrelationManager } from './correlation';

export class TracingService {
  private static instance: TracingService;
  private sdk: NodeSDK | null = null;
  private tracer = trace.getTracer('science-map-tracer');

  static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }

  initialize(serviceName: string, serviceVersion: string): void {
    if (this.sdk) {
      return;
    }

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env['NODE_ENV'] || 'development',
    });

    const exporter = new OTLPTraceExporter({
      url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318/v1/traces',
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter: exporter as any,
      spanProcessor: new BatchSpanProcessor(exporter as any) as any,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    this.sdk.start();
  }

  createSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      correlationId?: string;
      userId?: string;
    }
  ) {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: {
        ...options?.attributes,
        'correlation.id': options?.correlationId || '',
        'user.id': options?.userId || '',
      },
    });

    return span;
  }

  createChildSpan(
    parentSpan: { spanContext: () => { traceId: string; spanId: string } },
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ) {
    return this.tracer.startSpan(
      name,
      {
        kind: options?.kind || SpanKind.INTERNAL,
        attributes: options?.attributes || {},
      },
      (context as any).setSpan(context.active(), parentSpan as any)
    );
  }

  addSpanAttributes(
    span: { setAttributes: (attrs: Record<string, string | number | boolean>) => void },
    attributes: Record<string, string | number | boolean>
  ): void {
    span.setAttributes(attributes);
  }

  addSpanEvent(
    span: { addEvent: (name: string, attrs?: Record<string, string | number | boolean>) => void },
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    span.addEvent(name, attributes);
  }

  setSpanError(
    span: {
      recordException: (error: Error) => void;
      setStatus: (status: { code: number; message?: string }) => void;
    },
    error: Error
  ): void {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }

  finishSpan(span: { end: () => void }): void {
    span.end();
  }

  shutdown(): Promise<void> {
    return this.sdk?.shutdown() || Promise.resolve();
  }
}

export const tracingMiddleware = (_serviceName: string) => {
  const tracingService = TracingService.getInstance();

  return (req: any, res: any, next: () => void): void => {
    const correlationId =
      CorrelationManager.extractCorrelationId(req.headers) ||
      CorrelationManager.generateCorrelationId();
    const userId = CorrelationManager.extractUserId(req.headers);
    const requestId =
      CorrelationManager.extractRequestId(req.headers) || CorrelationManager.generateRequestId();

    const span = tracingService.createSpan(`${req.method || 'GET'} ${req.path || '/'}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method || 'GET',
        'http.url': req.url || '/',
        'http.route': req.route?.path || req.path || '/',
        'http.user_agent': (req.headers['user-agent'] as string) || '',
        'http.request_id': requestId,
      },
      correlationId: correlationId || '',
      userId: userId || '',
    });

    req.correlationId = correlationId;
    req.userId = userId;
    req.requestId = requestId;
    req.span = span;

    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_size': res.get('content-length') || 0,
      });
      tracingService.finishSpan(span);
    });

    next();
  };
};
