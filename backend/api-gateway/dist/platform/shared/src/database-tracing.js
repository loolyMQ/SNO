import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
export class DatabaseTracing {
    tracingManager;
    constructor(tracingManager) {
        this.tracingManager = tracingManager;
    }
    async traceQuery(operation, query, params = [], executor) {
        const startTime = Date.now();
        const table = this.extractTableFromQuery(query);
        return this.tracingManager.traceFunction(`DB ${operation}${table ? ` ${table}` : ''}`, async (span) => {
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
            }
            catch (error) {
                const duration = Date.now() - startTime;
                if (error instanceof Error) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error.message,
                    });
                    span.setAttributes({
                        'db.error.type': error.name || 'UnknownError',
                        'db.error.code': error.code,
                        'db.operation_duration_ms': duration,
                    });
                    span.addEvent('exception', {
                        'exception.message': error.message,
                        'exception.type': error.name,
                    });
                }
                throw error;
            }
        }, { kind: SpanKind.CLIENT });
    }
    async traceSelect(query, params = [], executor) {
        return this.traceQuery('SELECT', query, params, executor);
    }
    async traceInsert(query, params = [], executor) {
        return this.traceQuery('INSERT', query, params, executor);
    }
    async traceUpdate(query, params = [], executor) {
        return this.traceQuery('UPDATE', query, params, executor);
    }
    async traceDelete(query, params = [], executor) {
        return this.traceQuery('DELETE', query, params, executor);
    }
    async traceTransaction(name, executor) {
        return this.tracingManager.traceFunction(`DB Transaction ${name}`, async (span) => {
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
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                span.addEvent('db.transaction.rollback', {
                    'db.error': errorMessage,
                });
                throw error;
            }
        }, { kind: SpanKind.CLIENT });
    }
    extractTableFromQuery(query) {
        const cleanQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
        const selectMatch = cleanQuery.match(/from\s+([a-z_][a-z0-9_]*)/);
        if (selectMatch)
            return selectMatch[1];
        const insertMatch = cleanQuery.match(/insert\s+into\s+([a-z_][a-z0-9_]*)/);
        if (insertMatch)
            return insertMatch[1];
        const updateMatch = cleanQuery.match(/update\s+([a-z_][a-z0-9_]*)/);
        if (updateMatch)
            return updateMatch[1];
        const deleteMatch = cleanQuery.match(/delete\s+from\s+([a-z_][a-z0-9_]*)/);
        if (deleteMatch)
            return deleteMatch[1];
        return undefined;
    }
    sanitizeQuery(query) {
        return query
            .replace(/\$\d+/g, '?')
            .replace(/'[^']*'/g, "'?'")
            .replace(/\b\d+\b/g, '?')
            .replace(/\s+/g, ' ')
            .trim();
    }
    analyzeQueryResult(result) {
        if (Array.isArray(result)) {
            return {
                rowsAffected: result.length,
                type: 'array',
            };
        }
        if (result && typeof result === 'object') {
            if ('rowCount' in result) {
                return {
                    rowsAffected: result.rowCount || 0,
                    type: 'command',
                };
            }
            if ('rows' in result) {
                return {
                    rowsAffected: result.rows?.length || 0,
                    type: 'select',
                };
            }
        }
        return {
            rowsAffected: result ? 1 : 0,
            type: 'single',
        };
    }
    getConnectionString() {
        const host = process.env['DB_HOST'] || 'localhost';
        const port = process.env['DB_PORT'] || '5432';
        const database = process.env['DB_NAME'] || 'postgres';
        const user = process.env['DB_USER'] || 'postgres';
        const password = process.env['DB_PASSWORD'] || 'postgres';
        return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    }
}
export class TracedRepository {
    tracingManager;
    dbTracing;
    constructor(tracingManager) {
        this.tracingManager = tracingManager;
        this.dbTracing = new DatabaseTracing(tracingManager);
    }
    async findById(id, table, executor) {
        return this.dbTracing.traceSelect(`SELECT id FROM ${table} WHERE id = $1`, [id], executor);
    }
    async findAll(table, executor) {
        return this.dbTracing.traceSelect(`SELECT id FROM ${table}`, [], executor);
    }
    async create(data, table, executor) {
        const fields = Object.keys(data).join(', ');
        const placeholders = Object.keys(data)
            .map((_, i) => `$${i + 1}`)
            .join(', ');
        return this.dbTracing.traceInsert(`INSERT INTO ${table} (${fields}) VALUES (${placeholders})`, Object.values(data), executor);
    }
    async update(id, data, table, executor) {
        const fields = Object.keys(data)
            .map((key, i) => `${key} = $${i + 2}`)
            .join(', ');
        return this.dbTracing.traceUpdate(`UPDATE ${table} SET ${fields} WHERE id = $1`, [id, ...Object.values(data)], executor);
    }
    async delete(id, table, executor) {
        return this.dbTracing.traceDelete(`DELETE FROM ${table} WHERE id = $1`, [id], executor);
    }
}
export function DatabaseTrace(operation, table) {
    return function (_target, _propertyName, descriptor) {
        const method = descriptor.value;
        const opName = operation || _propertyName;
        descriptor.value = async function (...args) {
            const tracingManager = this.tracingManager;
            const dbTracing = this.dbTracing;
            if (!tracingManager || !dbTracing) {
                return method.apply(this, args);
            }
            return dbTracing.traceQuery(opName, `${opName} operation on ${table || 'unknown table'}`, [], () => method.apply(this, args));
        };
        return descriptor;
    };
}
export const DatabaseTracingUtils = {
    createDatabaseTraceContext(tracingManager, operation, table) {
        const traceContext = tracingManager.getCurrentTraceContext();
        return {
            ...traceContext,
            operation: `db.${operation}${table ? `.${table}` : ''}`,
            database: process.env['DB_NAME'] || 'postgres',
        };
    },
    isSlowQuery(duration, operation) {
        const thresholds = {
            SELECT: 1000,
            INSERT: 500,
            UPDATE: 500,
            DELETE: 500,
            default: 1000,
        };
        const threshold = thresholds[operation.toUpperCase()] || thresholds.default;
        return duration > threshold;
    },
    formatDatabaseTraceForLogs(operation) {
        return {
            operation: operation.operation,
            table: operation.table,
            duration: operation.duration,
            rowsAffected: operation.rowsAffected,
            isSlowQuery: this.isSlowQuery(operation.duration, operation.operation),
            query: operation.query?.substring(0, 100) +
                (operation.query && operation.query.length > 100 ? '...' : ''),
        };
    },
};
//# sourceMappingURL=database-tracing.js.map