import { TracingManager, IDatabaseTraceData } from './tracing';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

export interface ITracedDatabaseOperation {
  query: string;
  params?: unknown[];
  operation: string;
  table?: string;
  startTime: number;
}

export class DatabaseTracing {
  constructor(private tracingManager: TracingManager) {}

  async traceQuery<T>(
    operation: string,
    query: string,
    params: unknown[] = [],
    executor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const table = this.extractTableFromQuery(query);

    return this.tracingManager.traceFunction(
      `DB ${operation}${table ? ` ${table}` : ''}`,
      async (span: any) => {
        try {
          span.setAttributes({
            'db.system': 'postgresql',
            'db.operation': operation.toLowerCase(),
            'db.sql.table': table,
            'db.statement': this.sanitizeQuery(query),
            'db.statement.params_count': params.length,
            'db.connection_string': this.getConnectionString(),
          });

          if (params.length > 0) {
            span.setAttributes({
              'db.statement.has_params': true,
              'db.statement.params_types': params.map(p => typeof p).join(','),
            });
          }

          span.addEvent('db.query.start', {
            'db.query.length': query.length,
          });

          const result = await executor();
          const duration = Date.now() - startTime;

          const resultInfo = this.analyzeQueryResult(result);

          span.setAttributes({
            'db.rows_affected': resultInfo.rowsAffected,
            'db.result.type': resultInfo.type,
            'db.operation_duration_ms': duration,
          });

          span.addEvent('db.query.complete', {
            'db.rows_affected': resultInfo.rowsAffected,
            'db.duration_ms': duration,
          });

          this.tracingManager.traceDatabaseOperation({
            operation,
            table: table ?? 'unknown',
            query: this.sanitizeQuery(query),
            rowsAffected: resultInfo.rowsAffected,
            duration,
          });

          if (duration > 1000) {
            span.addEvent('db.slow_query_detected', {
              'db.duration_ms': duration,
              'db.threshold_ms': 1000,
            });
          }

          return result;
        } catch (error: unknown) {
          const duration = Date.now() - startTime;

          if (error instanceof Error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });

            span.setAttributes({
              'db.error.type': error.name || 'UnknownError',
              'db.error.code': (error as { code?: string }).code,
              'db.operation_duration_ms': duration,
            });
            span.addEvent('exception', {
              'exception.message': error.message,
              'exception.type': error.name,
            });
          }

          throw error;
        }
      },
      { kind: SpanKind.CLIENT }
    );
  }

  async traceSelect<T>(
    query: string,
    params: unknown[] = [],
    executor: () => Promise<T>
  ): Promise<T> {
    return this.traceQuery('SELECT', query, params, executor);
  }

  async traceInsert<T>(
    query: string,
    params: unknown[] = [],
    executor: () => Promise<T>
  ): Promise<T> {
    return this.traceQuery('INSERT', query, params, executor);
  }

  async traceUpdate<T>(
    query: string,
    params: unknown[] = [],
    executor: () => Promise<T>
  ): Promise<T> {
    return this.traceQuery('UPDATE', query, params, executor);
  }

  async traceDelete<T>(
    query: string,
    params: unknown[] = [],
    executor: () => Promise<T>
  ): Promise<T> {
    return this.traceQuery('DELETE', query, params, executor);
  }

  async traceTransaction<T>(name: string, executor: () => Promise<T>): Promise<T> {
    return this.tracingManager.traceFunction(
      `DB Transaction ${name}`,
      async (span: any) => {
        span.setAttributes({
          'db.system': 'postgresql',
          'db.operation': 'transaction',
          'db.transaction.name': name,
        });

        try {
          span.addEvent('db.transaction.begin');
          const result = await executor();
          span.addEvent('db.transaction.commit');
          return result;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          span.addEvent('db.transaction.rollback', {
            'db.error': errorMessage,
          });
          throw error;
        }
      },
      { kind: SpanKind.CLIENT }
    );
  }

  private extractTableFromQuery(query: string): string | undefined {
    const cleanQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

    const selectMatch = cleanQuery.match(/from\s+([a-z_][a-z0-9_]*)/);
    if (selectMatch) return selectMatch[1];

    const insertMatch = cleanQuery.match(/insert\s+into\s+([a-z_][a-z0-9_]*)/);
    if (insertMatch) return insertMatch[1];

    const updateMatch = cleanQuery.match(/update\s+([a-z_][a-z0-9_]*)/);
    if (updateMatch) return updateMatch[1];

    const deleteMatch = cleanQuery.match(/delete\s+from\s+([a-z_][a-z0-9_]*)/);
    if (deleteMatch) return deleteMatch[1];

    return undefined;
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\b\d+\b/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private analyzeQueryResult(result: unknown): { rowsAffected: number; type: string } {
    if (Array.isArray(result)) {
      return {
        rowsAffected: result.length,
        type: 'array',
      };
    }

    if (result && typeof result === 'object') {
      if ('rowCount' in result) {
        return {
          rowsAffected: (result as any).rowCount || 0,
          type: 'command',
        };
      }

      if ('rows' in result) {
        return {
          rowsAffected: (result as any).rows?.length || 0,
          type: 'select',
        };
      }
    }

    return {
      rowsAffected: result ? 1 : 0,
      type: 'single',
    };
  }

  private getConnectionString(): string {
    const host = process.env['DB_HOST'] || 'localhost';
    const port = process.env['DB_PORT'] || '5432';
    const database = process.env['DB_NAME'] || 'postgres';
    const user = process.env['DB_USER'] || 'postgres';
    const password = process.env['DB_PASSWORD'] || 'postgres';

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
}

export abstract class TracedRepository {
  protected dbTracing: DatabaseTracing;

  constructor(protected tracingManager: TracingManager) {
    this.dbTracing = new DatabaseTracing(tracingManager);
  }

  protected async findById<T>(
    id: string | number,
    table: string,
    executor: () => Promise<T>
  ): Promise<T> {
    return this.dbTracing.traceSelect(`SELECT id FROM ${table} WHERE id = $1`, [id], executor);
  }

  protected async findAll<T>(table: string, executor: () => Promise<T>): Promise<T> {
    return this.dbTracing.traceSelect(`SELECT id FROM ${table}`, [], executor);
  }

  protected async create<T>(
    data: Record<string, unknown>,
    table: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(', ');

    return this.dbTracing.traceInsert(
      `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`,
      Object.values(data),
      executor
    );
  }

  protected async update<T>(
    id: string | number,
    data: Record<string, unknown>,
    table: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const fields = Object.keys(data)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    return this.dbTracing.traceUpdate(
      `UPDATE ${table} SET ${fields} WHERE id = $1`,
      [id, ...Object.values(data)],
      executor
    );
  }

  protected async delete<T>(
    id: string | number,
    table: string,
    executor: () => Promise<T>
  ): Promise<T> {
    return this.dbTracing.traceDelete(`DELETE FROM ${table} WHERE id = $1`, [id], executor);
  }
}

export function DatabaseTrace(operation?: string, table?: string) {
  return function (_target: object, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const opName = operation || _propertyName;

    descriptor.value = async function (...args: unknown[]) {
      const tracingManager = (this as { tracingManager?: unknown }).tracingManager;
      const dbTracing = (this as { dbTracing?: unknown }).dbTracing;

      if (!tracingManager || !dbTracing) {
        return method.apply(this, args);
      }

      return (dbTracing as any).traceQuery(
        opName,
        `${opName} operation on ${table || 'unknown table'}`,
        [],
        () => method.apply(this, args)
      );
    };

    return descriptor;
  };
}

export const DatabaseTracingUtils = {
  createDatabaseTraceContext(
    tracingManager: TracingManager,
    operation: string,
    table?: string
  ): Record<string, unknown> {
    const traceContext = tracingManager.getCurrentTraceContext();

    return {
      ...traceContext,
      operation: `db.${operation}${table ? `.${table}` : ''}`,
      database: process.env['DB_NAME'] || 'postgres',
    };
  },

  isSlowQuery(duration: number, operation: string): boolean {
    const thresholds = {
      SELECT: 1000,
      INSERT: 500,
      UPDATE: 500,
      DELETE: 500,
      default: 1000,
    };

    const threshold = (thresholds as any)[operation.toUpperCase()] || thresholds.default;
    return duration > threshold;
  },

  formatDatabaseTraceForLogs(operation: IDatabaseTraceData): Record<string, unknown> {
    return {
      operation: operation.operation,
      table: operation.table,
      duration: operation.duration,
      rowsAffected: operation.rowsAffected,
      isSlowQuery: this.isSlowQuery(operation.duration, operation.operation),
      query:
        operation.query?.substring(0, 100) +
        (operation.query && operation.query.length > 100 ? '...' : ''),
    };
  },
};
