import { register, Counter, Gauge } from 'prom-client';
export declare const graphRequestsTotal: Counter<"route" | "method" | "status_code">;
export declare const graphEventsProcessed: Counter<"status" | "event_type">;
export declare const graphDataSize: Gauge<string>;
export declare const graphNodesCount: Gauge<string>;
export declare const graphEdgesCount: Gauge<string>;
export { register };
//# sourceMappingURL=metrics.d.ts.map