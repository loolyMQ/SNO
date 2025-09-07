import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
// import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { MonitoringConfig } from '../types';

export class TracingManager {
  private sdk: NodeSDK | null = null;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  initialize(): void {
    if (!this.config.tracing.enabled) {
      return;
    }

    // const resource = new Resource({
    //   [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
    //   [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
    //   [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
    // });

    const instrumentations = this.getInstrumentations();
    const exporter = this.getExporter();

    this.sdk = new NodeSDK({
      // resource,
      traceExporter: exporter,
      instrumentations,
    });

    this.sdk.start();
  }

  private getInstrumentations() {
    const instrumentations = [];

    if (this.config.instrumentation.http) {
      instrumentations.push(
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span: any, request: any) => {
              span.setAttributes({
                'http.request.body.size': (request as any).getHeader?.('content-length') || 0,
              });
            },
            responseHook: (span: any, response: any) => {
              span.setAttributes({
                'http.response.body.size': (response as any).getHeader?.('content-length') || 0,
              });
            },
          },
        })
      );
    }

    if (this.config.instrumentation.express) {
      instrumentations.push(
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
        })
      );
    }

    if (this.config.instrumentation.pg) {
      instrumentations.push(
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
          },
        })
      );
    }

    if (this.config.instrumentation.redis) {
      instrumentations.push(
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        })
      );
    }

    return instrumentations;
  }

  private getExporter() {
    switch (this.config.tracing.exporter) {
      case 'jaeger':
        return new JaegerExporter({
          endpoint: this.config.tracing.jaeger?.endpoint || 'http://localhost:14268/api/traces',
        });

      case 'zipkin':
        return new ZipkinExporter({
          url: this.config.tracing.zipkin?.url || 'http://localhost:9411/api/v2/spans',
        });

      case 'console':
      default:
        return undefined; // Использует консольный экспортер по умолчанию
    }
  }

  shutdown(): Promise<void> {
    if (this.sdk) {
      return this.sdk.shutdown();
    }
    return Promise.resolve();
  }
}

// Утилиты для создания кастомных спанов
export class CustomTracing {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Создание спана для бизнес-логики
  createBusinessSpan(operationName: string, attributes?: Record<string, any>) {
    const { trace } = require('@opentelemetry/api');
    const tracer = trace.getTracer(this.serviceName);
    
    return tracer.startActiveSpan(operationName, (span: any) => {
      if (attributes) {
        span.setAttributes(attributes);
      }
      
      return {
        span,
        setAttribute: (key: string, value: any) => span.setAttribute(key, value),
        setAttributes: (attrs: Record<string, any>) => span.setAttributes(attrs),
        addEvent: (name: string, attributes?: Record<string, any>) => span.addEvent(name, attributes),
        end: () => span.end(),
      };
    });
  }

  // Создание спана для внешних вызовов
  createExternalCallSpan(serviceName: string, operation: string, attributes?: Record<string, any>) {
    const { trace } = require('@opentelemetry/api');
    const tracer = trace.getTracer(this.serviceName);
    
    return tracer.startActiveSpan(`external.${serviceName}.${operation}`, (span: any) => {
      span.setAttributes({
        'external.service': serviceName,
        'external.operation': operation,
        ...attributes,
      });
      
      return {
        span,
        setAttribute: (key: string, value: any) => span.setAttribute(key, value),
        setAttributes: (attrs: Record<string, any>) => span.setAttributes(attrs),
        addEvent: (name: string, attributes?: Record<string, any>) => span.addEvent(name, attributes),
        end: () => span.end(),
      };
    });
  }

  // Создание спана для обработки ошибок
  createErrorSpan(operationName: string, error: Error, attributes?: Record<string, any>) {
    const { trace } = require('@opentelemetry/api');
    const tracer = trace.getTracer(this.serviceName);
    
    return tracer.startActiveSpan(operationName, (span: any) => {
      span.setAttributes({
        'error': true,
        'error.message': error.message,
        'error.name': error.name,
        ...attributes,
      });
      
      if (error.stack) {
        span.setAttributes({
          'error.stack': error.stack,
        });
      }
      
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR status
      
      return {
        span,
        setAttribute: (key: string, value: any) => span.setAttribute(key, value),
        setAttributes: (attrs: Record<string, any>) => span.setAttributes(attrs),
        addEvent: (name: string, attributes?: Record<string, any>) => span.addEvent(name, attributes),
        end: () => span.end(),
      };
    });
  }
}
