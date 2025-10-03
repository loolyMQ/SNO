import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

export class JaegerTracing {
  private sdk: NodeSDK;

  constructor(serviceName: string, jaegerEndpoint?: string) {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter: new JaegerExporter({
        endpoint: jaegerEndpoint || process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });
  }

  public start(): void {
    this.sdk.start();
    // Jaeger tracing started
  }

  public shutdown(): Promise<void> {
    return this.sdk.shutdown();
  }
}

export const initializeTracing = (serviceName: string, jaegerEndpoint?: string): JaegerTracing => {
  return new JaegerTracing(serviceName, jaegerEndpoint);
};
