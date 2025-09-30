import { register, Counter, Histogram, Gauge } from 'prom-client';
export declare const jobsRequestsTotal: Counter<"route" | "method" | "status_code">;
export declare const jobsRequestDuration: Histogram<"route" | "method" | "status_code">;
export declare const jobsEventsProcessed: Counter<"status" | "event_type">;
export declare const jobsActiveTotal: Gauge<string>;
export declare const jobsCompletedTotal: Counter<"status" | "job_type">;
export declare const jobsScheduledTotal: Counter<"job_type">;
export { register };
//# sourceMappingURL=metrics.d.ts.map