export declare const EventTypes: {
    readonly USER_REGISTERED: "user.registered";
    readonly USER_LOGIN: "user.login";
    readonly USER_LOGOUT: "user.logout";
    readonly TOKEN_REFRESHED: "user.token.refreshed";
    readonly GRAPH_DATA_REQUESTED: "graph.data.requested";
    readonly GRAPH_DATA_UPDATED: "graph.data.updated";
    readonly NODE_CREATED: "graph.node.created";
    readonly NODE_UPDATED: "graph.node.updated";
    readonly EDGE_CREATED: "graph.edge.created";
    readonly SEARCH_QUERY: "search.query";
    readonly SEARCH_RESULTS: "search.results";
    readonly INDEX_UPDATED: "search.index.updated";
    readonly JOB_SCHEDULED: "job.scheduled";
    readonly JOB_COMPLETED: "job.completed";
    readonly JOB_FAILED: "job.failed";
};
export declare const Topics: {
    readonly AUTH_EVENTS: "auth-events";
    readonly GRAPH_EVENTS: "graph-events";
    readonly SEARCH_EVENTS: "search-events";
    readonly JOB_EVENTS: "job-events";
};
export declare const utils: {
    generateCorrelationId: () => string;
    createEvent: (type: string, payload: unknown, userId?: string, correlationId?: string) => {
        type: string;
        payload: unknown;
        correlationId: string;
        userId: string | undefined;
        timestamp: number;
    };
};
//# sourceMappingURL=events.d.ts.map