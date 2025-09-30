import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
export class MetricsService {
    static instance;
    meter;
    counters = new Map();
    histograms = new Map();
    gauges = new Map();
    static getInstance() {
        if (!MetricsService.instance) {
            MetricsService.instance = new MetricsService();
        }
        return MetricsService.instance;
    }
    initialize(serviceName, serviceVersion) {
        const resource = new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env['NODE_ENV'] || 'development',
        });
        const exporter = new OTLPMetricExporter({
            url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318/v1/metrics',
        });
        const reader = new PeriodicExportingMetricReader({
            exporter: exporter,
            exportIntervalMillis: 10000,
        });
        const meterProvider = new MeterProvider({
            resource,
            readers: [reader],
        });
        metrics.setGlobalMeterProvider(meterProvider);
        this.meter = metrics.getMeter(serviceName, serviceVersion);
    }
    createCounter(name, _description, _unit) {
        if (this.counters.has(name)) {
            return this.counters.get(name);
        }
        const counter = this.meter.createCounter(name);
        this.counters.set(name, counter);
        return counter;
    }
    createHistogram(name, _description, _unit) {
        if (this.histograms.has(name)) {
            return this.histograms.get(name);
        }
        const histogram = this.meter.createHistogram(name);
        this.histograms.set(name, histogram);
        return histogram;
    }
    createGauge(name, _description, _unit) {
        if (this.gauges.has(name)) {
            return this.gauges.get(name);
        }
        const gauge = this.meter.createCounter(name);
        this.gauges.set(name, gauge);
        return gauge;
    }
    recordCounter(name, value, _attributes) {
        const counter = this.counters.get(name);
        if (counter) {
            counter.add(value);
        }
    }
    recordHistogram(name, value, _attributes) {
        const histogram = this.histograms.get(name);
        if (histogram) {
            histogram.record(value);
        }
    }
    recordGauge(name, value, _attributes) {
        const gauge = this.gauges.get(name);
        if (gauge) {
            gauge.add(value);
        }
    }
}
//# sourceMappingURL=metrics.js.map