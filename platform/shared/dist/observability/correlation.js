import { randomUUID } from 'crypto';
export class CorrelationManager {
    static CORRELATION_HEADER = 'x-correlation-id';
    static USER_HEADER = 'x-user-id';
    static REQUEST_HEADER = 'x-request-id';
    static generateCorrelationId() {
        return randomUUID();
    }
    static generateRequestId() {
        return randomUUID();
    }
    static extractCorrelationId(headers) {
        const correlationId = headers[this.CORRELATION_HEADER];
        return Array.isArray(correlationId) ? correlationId[0] : correlationId;
    }
    static extractUserId(headers) {
        const userId = headers[this.USER_HEADER];
        return Array.isArray(userId) ? userId[0] : userId;
    }
    static extractRequestId(headers) {
        const requestId = headers[this.REQUEST_HEADER];
        return Array.isArray(requestId) ? requestId[0] : requestId;
    }
    static createHeaders(correlationId, userId, requestId) {
        const headers = {};
        if (correlationId) {
            headers[this.CORRELATION_HEADER] = correlationId;
        }
        if (userId) {
            headers[this.USER_HEADER] = userId;
        }
        if (requestId) {
            headers[this.REQUEST_HEADER] = requestId;
        }
        return headers;
    }
    static getCorrelationHeader() {
        return this.CORRELATION_HEADER;
    }
    static getUserHeader() {
        return this.USER_HEADER;
    }
    static getRequestHeader() {
        return this.REQUEST_HEADER;
    }
}
//# sourceMappingURL=correlation.js.map