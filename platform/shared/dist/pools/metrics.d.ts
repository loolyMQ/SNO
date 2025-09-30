import { Counter, Gauge, Histogram } from 'prom-client';
export declare const poolConnectionsTotal: Gauge<"status" | "pool_type" | "pool_name">;
export declare const poolConnectionsActive: Gauge<"pool_type" | "pool_name">;
export declare const poolConnectionsIdle: Gauge<"pool_type" | "pool_name">;
export declare const poolOperationsTotal: Counter<"operation" | "status" | "pool_type" | "pool_name">;
export declare const poolConnectionDuration: Histogram<"pool_type" | "pool_name">;
export declare const poolWaitingConnections: Gauge<"pool_type" | "pool_name">;
//# sourceMappingURL=metrics.d.ts.map