import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace, SpanKind, SpanStatusCode, Tracer, Span } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
// import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'; // Not used
// import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http'; // Not used
// import { IncomingMessage } from 'http'; // Not used

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

export class TracingManager {
  private tracer!: Tracer;
  private config: ITracingConfig;
  private sdk?: NodeSDK;
  private logger: any;

  constructor(config: ITracingConfig) {
    this.config = config;
    this.logger = console; // Simple logger for now
    this.initializeTracing();
  }

  private initializeTracing(): void {
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      })
    );

    const traceExporters = this.createTraceExporters();
    // const metricExporters = this.createMetricExporters(); // Not used

    this.sdk = new NodeSDK({
      resource,
      traceExporter:
        traceExporters.length > 1
          ? new (require('@opentelemetry/sdk-trace-node').MultiSpanExporter)(traceExporters)
          : traceExporters[0],
      // metricReader: metricExporters.length > 0 ? metricExporters[0] : undefined, // Type mismatch
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req: any) => {
              return req.url?.includes('/health') || req.url?.includes('/metrics');
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    this.sdk.start();

    this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);

    this.logger.info({ serviceName: this.config.serviceName }, 'Tracing initialized');
  }

  private createTraceExporters(): unknown[] {
    const exporters: unknown[] = [];

    if (this.config.enableConsoleExporter) {
      exporters.push(new ConsoleSpanExporter());
    }

    if (this.config.jaegerEndpoint) {
      exporters.push(
        new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
        })
      );
    }

    if (this.config.otlpEndpoint) {
      exporters.push(
        new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        })
      );
    }

    if (exporters.length === 0) {
      exporters.push(new ConsoleSpanExporter());
    }

    return exporters;
  }

  // private createMetricExporters(): unknown[] { // Not used
  //   const exporters: unknown[] = [];
  //
  //   if (this.config.otlpEndpoint) {
  //     // const metricExporter = new OTLPMetricExporter({
  //     //   url: this.config.otlpEndpoint.replace('/traces', '/metrics'),
  //     // });
  //     // // Add forceFlush method to match interface
  //     // (metricExporter as any).forceFlush = () => Promise.resolve();
  //
  //     // exporters.push(new PeriodicExportingMetricReader({
  //     //   exporter: metricExporter,
  //     //   exportIntervalMillis: 5000,
  //     // })); // Commented out due to type mismatch
  //   }
  //
  //   return exporters;
  // }

  startSpan(name: string, options: Record<string, unknown> = {}): Span {
    return this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      ...options,
    });
  }

  startChildSpan(name: string, _parentSpan: Span, options: Record<string, unknown> = {}): Span {
    return this.tracer.startSpan(name, {
      // parent: parentSpan, // Not in SpanOptions interface
      kind: SpanKind.INTERNAL,
      ...options,
    });
  }

  async traceFunction<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options: Record<string, unknown> = {}
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  }

  traceHttpRequest(data: IHttpTraceData): Span {
    const span = this.startSpan(`HTTP ${data.method} ${data.url}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': data.method,
        'http.url': data.url,
        'http.status_code': data.statusCode,
        'http.user_agent': data.userAgent,
        'http.client_ip': data.ip,
        'user.id': data.userId,
        'http.request_duration_ms': data.duration,
      },
    });

    if (data.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${data.statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
    return span;
  }

  traceKafkaOperation(data: IKafkaTraceData): Span {
    const span = this.startSpan(`Kafka ${data.operation} ${data.topic}`, {
      kind: data.operation === 'produce' ? SpanKind.PRODUCER : SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': data.topic,
        'messaging.operation': data.operation,
        'messaging.kafka.partition': data.partition,
        'messaging.kafka.offset': data.offset,
        'messaging.message_payload_size_bytes': data.messageSize,
        'kafka.operation_duration_ms': data.duration,
      },
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return span;
  }

  traceDatabaseOperation(data: IDatabaseTraceData): Span {
    const span = this.startSpan(`DB ${data.operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': data.operation,
        'db.sql.table': data.table,
        'db.statement': data.query,
        'db.rows_affected': data.rowsAffected,
        'db.operation_duration_ms': data.duration,
      },
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return span;
  }

  getCurrentTraceContext(): ITraceContext | null {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return null;
    }

    const spanContext = activeSpan.spanContext();

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      operation: 'unknown',
      service: this.config.serviceName,
      timestamp: Date.now(),
    };
  }

  addAttributes(attributes: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  addEvent(name: string, attributes?: Record<string, any>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.logger.info('Tracing SDK shut down');
    }
  }
}

export function createTracingMiddleware(tracingManager: TracingManager) {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();

    const span = tracingManager.startSpan(`${req.method} ${req.url}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        // 'http.route': req.route?.path, // Not available
        // 'http.user_agent': req.get('User-Agent'), // Not available
        // 'http.client_ip': req.ip || req.connection.remoteAddress, // Not available
        // 'user.id': req.user?.id // Not available
      },
    });

    (req as any).traceContext = tracingManager.getCurrentTraceContext();

    (res as any).on('finish', () => {
      const duration = Date.now() - startTime;

      span.setAttributes({
        'http.status_code': (res as any).statusCode,
        'http.response.size': (res as any).get('Content-Length'),
        'http.request_duration_ms': duration,
      });

      if ((res as any).statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${(res as any).statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();

      tracingManager.traceHttpRequest({
        method: req.method,
        url: req.url,
        statusCode: (res as any).statusCode,
        userAgent: (req as any).get('User-Agent'),
        ip: (req as any).ip,
        userId: (req as any).user?.id,
        duration,
      });
    });

    next();
  };
}

export function Trace(operationName?: string) {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const opName =
      operationName ||
      `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: unknown[]) {
      const tracingManager =
        (this as { tracingManager?: TracingManager }).tracingManager || globalTracingManager;

      if (!tracingManager) {
        return method.apply(this, args);
      }

      return tracingManager.traceFunction(opName, async (span: Span) => {
        span.setAttributes({
          'code.function': propertyName,
          'code.namespace': target.constructor.name,
          'code.args_count': args.length,
        });

        return method.apply(this, args);
      });
    };

    return descriptor;
  };
}

export let globalTracingManager: TracingManager | null = null;

export class TracingFactory {
  static create(config: Partial<ITracingConfig> & { serviceName: string }): TracingManager {
    const defaultConfig: ITracingConfig = {
      serviceName: config.serviceName,
      serviceVersion: process.env['SERVICE_VERSION'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      jaegerEndpoint: process.env['JAEGER_ENDPOINT'],
      otlpEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'],
      enableConsoleExporter: process.env['NODE_ENV'] === 'development',
      sampleRate: parseFloat(process.env['OTEL_TRACE_SAMPLE_RATE'] || '1.0'),
    };

    const finalConfig = { ...defaultConfig, ...config };
    const manager = new TracingManager(finalConfig);

    globalTracingManager = manager;

    return manager;
  }

  static createForService(serviceName: string): TracingManager {
    return TracingFactory.create({ serviceName });
  }
}

export const TracingUtils = {
  extractTraceFromHeaders(headers: Record<string, string>): string | null {
    return headers['x-trace-id'] || headers['traceparent'] || null;
  },

  injectTraceToHeaders(headers: Record<string, string>, traceContext: ITraceContext): void {
    headers['x-trace-id'] = traceContext.traceId;
    headers['x-span-id'] = traceContext.spanId;
    headers['x-service'] = traceContext.service;
  },

  createCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  formatTraceForLogs(traceContext: ITraceContext | null): Record<string, unknown> {
    if (!traceContext) {
      return {};
    }

    return {
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      service: traceContext.service,
      operation: traceContext.operation,
    };
  },
};
