import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<["user", "admin", "moderator"]>>>;
}, "strip", z.ZodTypeAny, {
    password: string;
    name: string;
    email: string;
    role: "admin" | "user" | "moderator";
}, {
    password: string;
    name: string;
    email: string;
    role?: "admin" | "user" | "moderator" | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email: string;
}, {
    password: string;
    email: string;
}>;
export declare const verifySchema: z.ZodObject<{
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
export declare const userUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["user", "admin", "moderator"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    email?: string | undefined;
    role?: "admin" | "user" | "moderator" | undefined;
}, {
    name?: string | undefined;
    email?: string | undefined;
    role?: "admin" | "user" | "moderator" | undefined;
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
export declare const emailSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const tokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: string | undefined;
    page?: string | undefined;
}>;
export declare const searchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    page: number;
}, {
    query: string;
    limit?: string | undefined;
    page?: string | undefined;
}>;
export declare const idParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const correlationIdSchema: z.ZodObject<{
    'x-correlation-id': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    'x-correlation-id'?: string | undefined;
}, {
    'x-correlation-id'?: string | undefined;
}>;
export declare const authSchemas: {
    register: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        name: z.ZodString;
        role: z.ZodDefault<z.ZodOptional<z.ZodEnum<["user", "admin", "moderator"]>>>;
    }, "strip", z.ZodTypeAny, {
        password: string;
        name: string;
        email: string;
        role: "admin" | "user" | "moderator";
    }, {
        password: string;
        name: string;
        email: string;
        role?: "admin" | "user" | "moderator" | undefined;
    }>;
    login: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        email: string;
    }, {
        password: string;
        email: string;
    }>;
    verify: z.ZodObject<{
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
    logout: z.ZodObject<{
        token: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        token?: string | undefined;
    }, {
        token?: string | undefined;
    }>;
    userUpdate: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<["user", "admin", "moderator"]>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        email?: string | undefined;
        role?: "admin" | "user" | "moderator" | undefined;
    }, {
        name?: string | undefined;
        email?: string | undefined;
        role?: "admin" | "user" | "moderator" | undefined;
    }>;
    passwordChange: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currentPassword: string;
        newPassword: string;
    }, {
        currentPassword: string;
        newPassword: string;
    }>;
    email: z.ZodObject<{
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
    }, {
        email: string;
    }>;
    token: z.ZodObject<{
        token: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
    }, {
        token: string;
    }>;
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
    }, {
        limit?: string | undefined;
        page?: string | undefined;
    }>;
    search: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>>;
        query: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        query: string;
        limit: number;
        page: number;
    }, {
        query: string;
        limit?: string | undefined;
        page?: string | undefined;
    }>;
    idParam: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    correlationId: z.ZodObject<{
        'x-correlation-id': z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        'x-correlation-id'?: string | undefined;
    }, {
        'x-correlation-id'?: string | undefined;
    }>;
};
//# sourceMappingURL=auth-schemas.d.ts.map