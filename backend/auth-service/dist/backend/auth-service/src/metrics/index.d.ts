import { Counter, Gauge, Histogram } from 'prom-client';
export declare const authOperationsTotal: Counter<"status" | "operation">;
export declare const authRequestDuration: Histogram<"operation">;
export declare const activeUsers: Gauge<string>;
export declare const tokensIssued: Counter<"type">;
export declare const tokenValidationDuration: Histogram<string>;
//# sourceMappingURL=index.d.ts.map