import pino from 'pino';
import { IndexManager } from './database/index-manager';
import { IndexAnalyzer } from './database/index-analyzer';
import { IndexMetrics } from './database/index-metrics';

export interface IIndexConfig {
  field: string;
  type: 'hash' | 'btree' | 'compound';
  unique: boolean;
  sparse: boolean;
  fields?: string[];
}

export interface IQueryStats {
  field: string;
  operation: string;
  executionTime: number;
  resultCount: number;
  timestamp: number;
  indexUsed: boolean;
}

export class DatabaseIndexManager<T = any> {
  private manager: IndexManager<T>;
  private analyzer: IndexAnalyzer;
  private metrics: IndexMetrics;
  private logger: pino.Logger;
  constructor(serviceName: string) {
    this.logger = pino({
      level: process.env['LOG_LEVEL'] || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });

    this.manager = new IndexManager<T>(serviceName, this.logger);
    this.analyzer = new IndexAnalyzer(1000, this.logger);
    this.metrics = new IndexMetrics(serviceName, this.logger);
  }

  createIndex(name: string, config: IIndexConfig): void {
    this.manager.createIndex(name, config);
    this.metrics.recordIndexSize(name, 0);
  }

  addToIndexes(document: T): void {
    this.manager.addToIndexes(document);

    for (const indexName of this.manager.getAllIndexes()) {
      const size = this.manager.getIndexSize(indexName);
      this.metrics.recordIndexSize(indexName, size);
    }
  }

  removeFromIndexes(document: T): void {
    this.manager.removeFromIndexes(document);

    for (const indexName of this.manager.getAllIndexes()) {
      const size = this.manager.getIndexSize(indexName);
      this.metrics.recordIndexSize(indexName, size);
    }
  }

  findByIndex(indexName: string, value: unknown): T[] {
    const startTime = Date.now();

    try {
      const results = this.manager.findByIndex(indexName, value);
      const executionTime = Date.now() - startTime;

      this.analyzer.recordQuery(indexName, 'find', executionTime, results.length, true);
      this.metrics.recordIndexUsage(indexName, 'find', 'success');
      this.metrics.recordIndexExecutionTime(indexName, 'find', executionTime);

      return results;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.analyzer.recordQuery(indexName, 'find', executionTime, 0, false);
      this.metrics.recordIndexUsage(indexName, 'find', 'error');
      this.logger.error(`Index query failed for ${indexName}:`, error);
      throw error;
    }
  }

  findByCompoundIndex(indexName: string, values: { [field: string]: unknown }): T[] {
    const startTime = Date.now();

    try {
      const results = this.manager.findByCompoundIndex(indexName, values);
      const executionTime = Date.now() - startTime;

      this.analyzer.recordQuery(indexName, 'compound_find', executionTime, results.length, true);
      this.metrics.recordIndexUsage(indexName, 'compound_find', 'success');
      this.metrics.recordIndexExecutionTime(indexName, 'compound_find', executionTime);

      return results;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.analyzer.recordQuery(indexName, 'compound_find', executionTime, 0, false);
      this.metrics.recordIndexUsage(indexName, 'compound_find', 'error');
      this.logger.error(`Compound index query failed for ${indexName}:`, error);
      throw error;
    }
  }

  analyzeIndex(indexName: string) {
    return this.analyzer.analyzeIndex(indexName);
  }

  analyzeAllIndexes() {
    return this.analyzer.analyzeAllIndexes();
  }

  getSlowQueries(threshold: number = 100): IQueryStats[] {
    return this.analyzer.getSlowQueries(threshold);
  }

  getQueryPatterns() {
    return this.analyzer.getQueryPatterns();
  }

  suggestIndexes(): string[] {
    const existingIndexes = this.manager.getAllIndexes();
    return this.analyzer.suggestIndexes(existingIndexes);
  }

  getPerformanceReport(): string {
    const analyzerReport = this.analyzer.getPerformanceReport();
    const metricsReport = this.metrics.getIndexPerformanceReport();

    return `${analyzerReport}\n\n${metricsReport}`;
  }

  getMetrics(): Promise<string> {
    return this.metrics.getPrometheusMetrics();
  }

  getIndexUsageStats() {
    return this.metrics.getIndexUsageStats();
  }

  getAllIndexes(): string[] {
    return this.manager.getAllIndexes();
  }

  getIndexConfig(indexName: string): IIndexConfig | undefined {
    return this.manager.getIndexConfig(indexName);
  }

  dropIndex(indexName: string): boolean {
    const result = this.manager.dropIndex(indexName);
    if (result) {
      this.metrics.recordIndexSize(indexName, 0);
    }
    return result;
  }

  clearIndex(indexName: string): boolean {
    const result = this.manager.clearIndex(indexName);
    if (result) {
      this.metrics.recordIndexSize(indexName, 0);
    }
    return result;
  }

  getIndexSize(indexName: string): number {
    return this.manager.getIndexSize(indexName);
  }

  clearStats(): void {
    this.analyzer.clearStats();
    this.metrics.resetMetrics();
  }

  getStatsCount(): number {
    return this.analyzer.getStatsCount();
  }
}
