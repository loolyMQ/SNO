import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export class MetricsService {
  private static instance: MetricsService;
  private meter!: {
    createCounter: (name: string) => { add: (value: number) => void };
    createHistogram: (name: string) => { record: (value: number) => void };
  };
  private counters: Map<string, { add: (value: number) => void }> = new Map();
  private histograms: Map<string, { record: (value: number) => void }> = new Map();
  private gauges: Map<string, any> = new Map();

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  initialize(serviceName: string, serviceVersion: string): void {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env['NODE_ENV'] || 'development',
    });

    const exporter = new OTLPMetricExporter({
      url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318/v1/metrics',
    });

    const reader = new PeriodicExportingMetricReader({
      exporter: exporter as any,
      exportIntervalMillis: 10000,
    });

    const meterProvider = new MeterProvider({
      resource,
      readers: [reader],
    });

    metrics.setGlobalMeterProvider(meterProvider);
    this.meter = metrics.getMeter(serviceName, serviceVersion);
  }

  createCounter(name: string, _description: string, _unit?: string) {
    if (this.counters.has(name)) {
      return this.counters.get(name);
    }

    const counter = this.meter.createCounter(name);

    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(name: string, _description: string, _unit?: string) {
    if (this.histograms.has(name)) {
      return this.histograms.get(name);
    }

    const histogram = this.meter.createHistogram(name);

    this.histograms.set(name, histogram);
    return histogram;
  }

  createGauge(name: string, _description: string, _unit?: string) {
    if (this.gauges.has(name)) {
      return this.gauges.get(name);
    }

    const gauge = this.meter.createCounter(name);

    this.gauges.set(name, gauge);
    return gauge;
  }

  recordCounter(
    name: string,
    value: number,
    _attributes?: Record<string, string | number | boolean>
  ): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.add(value);
    }
  }

  recordHistogram(
    name: string,
    value: number,
    _attributes?: Record<string, string | number | boolean>
  ): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.record(value);
    }
  }

  recordGauge(
    name: string,
    value: number,
    _attributes?: Record<string, string | number | boolean>
  ): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.add(value);
    }
  }
}
