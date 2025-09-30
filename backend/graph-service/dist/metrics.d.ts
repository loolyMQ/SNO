import { register, Counter, Histogram } from 'prom-client';
export declare const graphOperationsTotal: Counter<"operation" | "status">;
export declare const graphRequestDuration: Histogram<"operation">;
export declare const nodeCount: Counter<"type">;
export declare const edgeCount: Counter<"type">;
export { register };
//# sourceMappingURL=metrics.d.ts.map