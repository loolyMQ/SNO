import { AppError, ErrorCode, ErrorSeverity } from '../errors';
export const validateRequest = (schema) => {
    return (req, _res, next) => {
        try {
            const result = schema.safeParse({
                body: req.body,
                query: req.query,
                params: req.params,
                headers: req.headers,
            });
            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                throw new AppError(ErrorCode.VALIDATION_INVALID_INPUT, 'Request validation failed', ErrorSeverity.MEDIUM, 'validation-middleware', {
                    context: { errors },
                    httpStatus: 400,
                });
            }
            req.validatedData = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const validateBody = (schema) => {
    return (req, _res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                throw new AppError(ErrorCode.VALIDATION_INVALID_INPUT, 'Request body validation failed', ErrorSeverity.MEDIUM, 'validation-middleware', {
                    context: { errors },
                    httpStatus: 400,
                });
            }
            req.body = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const validateQuery = (schema) => {
    return (req, _res, next) => {
        try {
            const result = schema.safeParse(req.query);
            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                throw new AppError(ErrorCode.VALIDATION_INVALID_INPUT, 'Query parameters validation failed', ErrorSeverity.MEDIUM, 'validation-middleware', {
                    context: { errors },
                    httpStatus: 400,
                });
            }
            req.query = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const validateParams = (schema) => {
    return (req, _res, next) => {
        try {
            const result = schema.safeParse(req.params);
            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                throw new AppError(ErrorCode.VALIDATION_INVALID_INPUT, 'Path parameters validation failed', ErrorSeverity.MEDIUM, 'validation-middleware', {
                    context: { errors },
                    httpStatus: 400,
                });
            }
            req.params = result.data;
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
//# sourceMappingURL=middleware.js.map