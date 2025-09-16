// Простая реализация метрик без внешних зависимостей
export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();

  increment(name: string, labels?: Record<string, string>): void {
    this.addMetric(name, 1, labels);
  }

  setValue(name: string, value: number, labels?: Record<string, string>): void {
    this.addMetric(name, value, labels);
  }

  observe(name: string, value: number, labels?: Record<string, string>): void {
    this.addMetric(name, value, labels);
  }

  private addMetric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push({
      name,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  getMetrics(): Map<string, Metric[]> {
    return this.metrics;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const metricsCollector = new MetricsCollector();

// HTTP метрики
export const httpRequestDuration = {
  labels: (labels: Record<string, string>) => ({
    observe: (value: number) =>
      metricsCollector.observe('http_request_duration_seconds', value, labels),
  }),
};

export const httpRequestTotal = {
  labels: (labels: Record<string, string>) => ({
    inc: () => metricsCollector.increment('http_requests_total', labels),
  }),
};

export const httpRequestSize = {
  labels: (labels: Record<string, string>) => ({
    observe: (value: number) => metricsCollector.observe('http_request_size_bytes', value, labels),
  }),
};

// Бизнес метрики
export const activeConnections = {
  set: (value: number) => metricsCollector.setValue('active_connections', value),
};

export const graphNodesTotal = {
  set: (value: number) => metricsCollector.setValue('graph_nodes_total', value),
};

export const graphEdgesTotal = {
  set: (value: number) => metricsCollector.setValue('graph_edges_total', value),
};

// Kafka метрики
export const kafkaMessagesProduced = {
  labels: (labels: Record<string, string>) => ({
    inc: () => metricsCollector.increment('kafka_messages_produced_total', labels),
  }),
};

export const kafkaMessagesConsumed = {
  labels: (labels: Record<string, string>) => ({
    inc: () => metricsCollector.increment('kafka_messages_consumed_total', labels),
  }),
};

export const kafkaProcessingDuration = {
  labels: (labels: Record<string, string>) => ({
    observe: (value: number) =>
      metricsCollector.observe('kafka_processing_duration_seconds', value, labels),
  }),
};

// Экспорт метрик в Prometheus формате
export function exportMetrics(): string {
  const metrics = metricsCollector.getMetrics();
  let output = '';

  for (const [name, metricList] of metrics) {
    for (const metric of metricList) {
      const labels = metric.labels
        ? Object.entries(metric.labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',')
        : '';

      const labelString = labels ? `{${labels}}` : '';
      output += `${name}${labelString} ${metric.value} ${metric.timestamp}\n`;
    }
  }

  return output;
}
