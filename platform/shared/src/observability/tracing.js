import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { CorrelationManager } from './correlation';
export class TracingService {
    static instance;
    sdk = null;
    tracer = trace.getTracer('science-map-tracer');
    static getInstance() {
        if (!TracingService.instance) {
            TracingService.instance = new TracingService();
        }
        return TracingService.instance;
    }
    initialize(serviceName, serviceVersion) {
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
            traceExporter: exporter,
            spanProcessor: new BatchSpanProcessor(exporter),
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
    createSpan(name, options) {
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
    createChildSpan(parentSpan, name, options) {
        return this.tracer.startSpan(name, {
            kind: options?.kind || SpanKind.INTERNAL,
            attributes: options?.attributes || {},
        }, context.setSpan(context.active(), parentSpan));
    }
    addSpanAttributes(span, attributes) {
        span.setAttributes(attributes);
    }
    addSpanEvent(span, name, attributes) {
        span.addEvent(name, attributes);
    }
    setSpanError(span, error) {
        span.recordException(error);
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
        });
    }
    finishSpan(span) {
        span.end();
    }
    shutdown() {
        return this.sdk?.shutdown() || Promise.resolve();
    }
}
export const tracingMiddleware = (_serviceName) => {
    const tracingService = TracingService.getInstance();
    return (req, res, next) => {
        const correlationId = CorrelationManager.extractCorrelationId(req.headers) ||
            CorrelationManager.generateCorrelationId();
        const userId = CorrelationManager.extractUserId(req.headers);
        const requestId = CorrelationManager.extractRequestId(req.headers) || CorrelationManager.generateRequestId();
        const span = tracingService.createSpan(`${req.method || 'GET'} ${req.path || '/'}`, {
            kind: SpanKind.SERVER,
            attributes: {
                'http.method': req.method || 'GET',
                'http.url': req.url || '/',
                'http.route': req.route?.path || req.path || '/',
                'http.user_agent': req.headers['user-agent'] || '',
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
//# sourceMappingURL=tracing.js.map