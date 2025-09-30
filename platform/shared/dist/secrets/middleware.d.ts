import { Request, Response, NextFunction } from 'express';
import { SecretsEngine } from './engine';
import { SecretType } from './types';
declare global {
    namespace Express {
        interface Request {
            secrets?: SecretsEngine;
        }
    }
}
export declare class SecretsMiddleware {
    private static instance;
    private engine;
    private constructor();
    static getInstance(): SecretsMiddleware;
    middleware(): (req: Request, _res: Response, next: NextFunction) => void;
    injectSecret(secretName: string, _secretType: SecretType): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateSecretAccess(requiredSecrets: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
}
//# sourceMappingURL=middleware.d.ts.map