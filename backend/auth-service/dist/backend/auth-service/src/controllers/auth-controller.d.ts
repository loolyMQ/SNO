import { Request, Response } from 'express';
import pino from 'pino';
import { PooledAuthService } from '../services/auth-service';
export declare class AuthController {
    private authService;
    private logger;
    constructor(authService: PooledAuthService, logger: pino.Logger);
    register(req: Request, res: Response): Promise<void>;
    login(req: Request, res: Response): Promise<void>;
    logout(req: Request, res: Response): Promise<void>;
    verify(req: Request, res: Response): Promise<void>;
    statistics(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=auth-controller.d.ts.map