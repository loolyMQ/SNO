export declare class CorrelationManager {
    private static readonly CORRELATION_HEADER;
    private static readonly USER_HEADER;
    private static readonly REQUEST_HEADER;
    static generateCorrelationId(): string;
    static generateRequestId(): string;
    static extractCorrelationId(headers: Record<string, string | string[] | undefined>): string | undefined;
    static extractUserId(headers: Record<string, string | string[] | undefined>): string | undefined;
    static extractRequestId(headers: Record<string, string | string[] | undefined>): string | undefined;
    static createHeaders(correlationId?: string, userId?: string, requestId?: string): Record<string, string>;
    static getCorrelationHeader(): string;
    static getUserHeader(): string;
    static getRequestHeader(): string;
}
//# sourceMappingURL=correlation.d.ts.map