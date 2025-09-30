import { z } from 'zod';
export const userRegistrationSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    role: z.enum(['USER', 'ADMIN', 'MODERATOR']).optional().default('USER'),
});
export const userLoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});
export const tokenRefreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});
export const userUpdateSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .optional(),
    email: z.string().email('Invalid email format').optional(),
    role: z.enum(['USER', 'ADMIN', 'MODERATOR']).optional(),
});
export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'New password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain uppercase, lowercase and number'),
});
export const verifyTokenSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});
export const logoutSchema = z.object({
    token: z.string().min(1, 'Token is required').optional(),
});
export const graphQuerySchema = z.object({
    query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
    filters: z.record(z.unknown()).optional(),
    limit: z.number().int().min(1).max(1000).optional().default(100),
    offset: z.number().int().min(0).optional().default(0),
});
export const graphNodeSchema = z.object({
    id: z.string().min(1, 'Node ID is required'),
    label: z.string().min(1, 'Node label is required').max(200, 'Label too long'),
    type: z.enum(['concept', 'topic', 'subtopic']),
    properties: z.record(z.unknown()).optional(),
});
export const graphEdgeSchema = z.object({
    id: z.string().min(1, 'Edge ID is required'),
    source: z.string().min(1, 'Source node ID is required'),
    target: z.string().min(1, 'Target node ID is required'),
    type: z.enum(['related', 'contains', 'depends']),
    weight: z.number().min(0).max(1).optional().default(1),
    properties: z.record(z.unknown()).optional(),
});
export const searchQuerySchema = z.object({
    query: z.string().min(1, 'Search query is required').max(500, 'Query too long'),
    filters: z.record(z.unknown()).optional(),
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
    sortBy: z.enum(['relevance', 'date', 'title']).optional().default('relevance'),
});
export const jobScheduleSchema = z.object({
    type: z.string().min(1, 'Job type is required'),
    payload: z.record(z.unknown()).optional(),
    scheduledFor: z.string().datetime().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
});
export const paginationSchema = z.object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export const correlationIdSchema = z.string().uuid('Invalid correlation ID format');
export const userIdSchema = z.string().uuid('Invalid user ID format');
export const serviceNameSchema = z.enum(['auth', 'graph', 'search', 'jobs']);
export const healthCheckSchema = z.object({
    service: serviceNameSchema,
    includeDetails: z.boolean().optional().default(false),
});
//# sourceMappingURL=schemas.js.map