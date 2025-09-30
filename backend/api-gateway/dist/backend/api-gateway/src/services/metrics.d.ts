import { register, Counter, Histogram } from 'prom-client';
export declare const gatewayRequestsTotal: Counter<"method" | "route" | "service" | "status_code">;
export declare const gatewayRequestDuration: Histogram<"method" | "route" | "service">;
export declare const serviceHealthStatus: Counter<"service" | "status">;
export { register };
//# sourceMappingURL=metrics.d.ts.map