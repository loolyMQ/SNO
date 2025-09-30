import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare const validateRequest: (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const validateBody: (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const validateQuery: (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const validateParams: (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => void;
declare global {
    namespace Express {
        interface Request {
            validatedData?: unknown;
        }
    }
}
//# sourceMappingURL=middleware.d.ts.map