import { z } from 'zod';
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            const validatedQuery = schema.parse(req.query);
            req.query = validatedQuery;
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid query parameters',
                        details: error.errors.map(err => ({
                            field: err.path.join('.'),
                            message: err.message,
                            code: err.code,
                        })),
                    },
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Query validation failed',
                },
            });
            return;
        }
    };
}
//# sourceMappingURL=query-middleware.js.map