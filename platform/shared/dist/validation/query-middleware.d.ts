import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare function validateQuery<T extends z.ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=query-middleware.d.ts.map