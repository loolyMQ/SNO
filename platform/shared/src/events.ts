export const EventTypes = {
    USER_REGISTERED: 'user.registered',
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    TOKEN_REFRESHED: 'user.token.refreshed',
    GRAPH_DATA_REQUESTED: 'graph.data.requested',
    GRAPH_DATA_UPDATED: 'graph.data.updated',
    NODE_CREATED: 'graph.node.created',
    NODE_UPDATED: 'graph.node.updated',
    EDGE_CREATED: 'graph.edge.created',
    SEARCH_QUERY: 'search.query',
    SEARCH_RESULTS: 'search.results',
    INDEX_UPDATED: 'search.index.updated',
    JOB_SCHEDULED: 'job.scheduled',
    JOB_COMPLETED: 'job.completed',
    JOB_FAILED: 'job.failed',
} as const;

export const Topics = {
    AUTH_EVENTS: 'auth-events',
    GRAPH_EVENTS: 'graph-events',
    SEARCH_EVENTS: 'search-events',
    JOB_EVENTS: 'job-events',
} as const;

export const utils = {
    generateCorrelationId: (): string => {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    },
    createEvent: (type: string, payload: unknown, userId?: string, correlationId?: string) => {
        return {
            type,
            payload,
            correlationId: correlationId || utils.generateCorrelationId(),
            userId,
            timestamp: Date.now(),
        };
    },
};
