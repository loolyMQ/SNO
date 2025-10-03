import { injectable } from 'inversify';
import { Counter, Histogram, Gauge, register } from 'prom-client';

export interface MetricsConfig {
  prefix: string;
  collectDefaultMetrics: boolean;
}

@injectable()
export class MetricsService {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();

  constructor() {
    if (process.env.NODE_ENV !== 'test') {
      register.clear();
    }
  }

  incrementCounter(name: string, labels: Record<string, string> = {}): void {
    const counter = this.getOrCreateCounter(name);
    counter.inc(labels);
  }

  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const histogram = this.getOrCreateHistogram(name);
    histogram.observe(labels, value);
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const gauge = this.getOrCreateGauge(name);
    gauge.set(labels, value);
  }

  private getOrCreateCounter(name: string): Counter {
    if (!this.counters.has(name)) {
      const counter = new Counter({
        name: `science_map_${name}`,
        help: `Science Map Platform ${name} counter`,
        labelNames: Object.keys({})
      });
      this.counters.set(name, counter);
    }
    const counter = this.counters.get(name);
    if (!counter) {
      throw new Error(`Counter ${name} not found`);
    }
    return counter;
  }

  private getOrCreateHistogram(name: string): Histogram {
    if (!this.histograms.has(name)) {
      const histogram = new Histogram({
        name: `science_map_${name}`,
        help: `Science Map Platform ${name} histogram`,
        labelNames: Object.keys({}),
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
      });
      this.histograms.set(name, histogram);
    }
    return this.histograms.get(name)!;
  }

  private getOrCreateGauge(name: string): Gauge {
    if (!this.gauges.has(name)) {
      const gauge = new Gauge({
        name: `science_map_${name}`,
        help: `Science Map Platform ${name} gauge`,
        labelNames: Object.keys({})
      });
      this.gauges.set(name, gauge);
    }
    return this.gauges.get(name)!;
  }

  getCounterValue(name: string, _labels: Record<string, string> = {}): number {
    // Labels will be used in future implementation
    // Counter value retrieved
    const counter = this.counters.get(name);
    if (!counter) {
      return 0;
    }
    return ((counter.get() as unknown) as { values: Array<{ value: number }> }).values[0]?.value || 0;
  }

  getGaugeValue(name: string, _labels: Record<string, string> = {}): number {
    // Labels will be used in future implementation
    // Gauge value retrieved
    const gauge = this.gauges.get(name);
    if (!gauge) {
      return 0;
    }
    return ((gauge.get() as unknown) as { values: Array<{ value: number }> }).values[0]?.value || 0;
  }

  getHistogramValue(name: string, _labels: Record<string, string> = {}): number {
    // Labels will be used in future implementation
    // Histogram value retrieved
    const histogram = this.histograms.get(name);
    if (!histogram) {
      return 0;
    }
    return ((histogram.get() as unknown) as { values: Array<{ value: number }> }).values[0]?.value || 0;
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  reset(): void {
    register.clear();
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}
