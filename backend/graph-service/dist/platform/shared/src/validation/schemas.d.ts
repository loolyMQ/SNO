import { z } from 'zod';
export declare const userRegistrationSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<["USER", "ADMIN", "MODERATOR"]>>>;
}, "strip", z.ZodTypeAny, {
    password: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN" | "MODERATOR";
}, {
    password: string;
    name: string;
    email: string;
    role?: "USER" | "ADMIN" | "MODERATOR" | undefined;
}>;
export declare const userLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>;
export declare const tokenRefreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const userUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["USER", "ADMIN", "MODERATOR"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    email?: string | undefined;
    role?: "USER" | "ADMIN" | "MODERATOR" | undefined;
}, {
    name?: string | undefined;
    email?: string | undefined;
    role?: "USER" | "ADMIN" | "MODERATOR" | undefined;
}>;
export declare const passwordChangeSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const verifyTokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const logoutSchema: z.ZodObject<{
    token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    token?: string | undefined;
}, {
    token?: string | undefined;
}>;
export declare const graphQuerySchema: z.ZodObject<{
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    offset: number;
    filters?: Record<string, unknown> | undefined;
}, {
    query: string;
    filters?: Record<string, unknown> | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const graphNodeSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["concept", "topic", "subtopic"]>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "topic" | "concept" | "subtopic";
    id: string;
    label: string;
    properties?: Record<string, unknown> | undefined;
}, {
    type: "topic" | "concept" | "subtopic";
    id: string;
    label: string;
    properties?: Record<string, unknown> | undefined;
}>;
export declare const graphEdgeSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodString;
    target: z.ZodString;
    type: z.ZodEnum<["related", "contains", "depends"]>;
    weight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    target: string;
    source: string;
    type: "related" | "contains" | "depends";
    id: string;
    weight: number;
    properties?: Record<string, unknown> | undefined;
}, {
    target: string;
    source: string;
    type: "related" | "contains" | "depends";
    id: string;
    properties?: Record<string, unknown> | undefined;
    weight?: number | undefined;
}>;
export declare const searchQuerySchema: z.ZodObject<{
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["relevance", "date", "title"]>>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    offset: number;
    sortBy: "date" | "relevance" | "title";
    filters?: Record<string, unknown> | undefined;
}, {
    query: string;
    filters?: Record<string, unknown> | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: "date" | "relevance" | "title" | undefined;
}>;
export declare const jobScheduleSchema: z.ZodObject<{
    type: z.ZodString;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    scheduledFor: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["low", "normal", "high", "urgent"]>>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    priority: "high" | "low" | "normal" | "urgent";
    payload?: Record<string, unknown> | undefined;
    scheduledFor?: string | undefined;
}, {
    type: string;
    payload?: Record<string, unknown> | undefined;
    scheduledFor?: string | undefined;
    priority?: "high" | "low" | "normal" | "urgent" | undefined;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    limit?: number | undefined;
    sortBy?: string | undefined;
    page?: number | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const correlationIdSchema: z.ZodString;
export declare const userIdSchema: z.ZodString;
export declare const serviceNameSchema: z.ZodEnum<["auth", "graph", "search", "jobs"]>;
export declare const healthCheckSchema: z.ZodObject<{
    service: z.ZodEnum<["auth", "graph", "search", "jobs"]>;
    includeDetails: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    service: "search" | "auth" | "graph" | "jobs";
    includeDetails: boolean;
}, {
    service: "search" | "auth" | "graph" | "jobs";
    includeDetails?: boolean | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map