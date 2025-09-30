import { Request, Response, NextFunction } from 'express';
import { FeatureFlagEngine } from './engine';
import { FeatureFlagContext } from './types';
export declare class FeatureFlagMiddleware {
    private static instance;
    private engine;
    constructor();
    static getInstance(): FeatureFlagMiddleware;
    getEngine(): FeatureFlagEngine;
    middleware(): (req: Request, _res: Response, next: NextFunction) => void;
    isEnabled(flagKey: string, context: FeatureFlagContext): boolean;
    getValue(flagKey: string, context: FeatureFlagContext): unknown;
}
declare global {
    namespace Express {
        interface Request {
            featureFlags: FeatureFlagEngine;
            featureFlagContext: FeatureFlagContext;
        }
    }
}
//# sourceMappingURL=middleware.d.ts.map