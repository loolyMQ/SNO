import { Request, Response } from 'express';
import pino from 'pino';
import { PooledAuthService } from '../services/auth-service';
import { authRequestDuration } from '../metrics';
import { StandardizedErrorHandler, ErrorCode } from '@science-map/shared';

export class AuthController {
  constructor(
    private authService: PooledAuthService,
    private logger: pino.Logger
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const start = Date.now();
    
    try {
      const { email, password, name, role } = req.body;
      const result = await this.authService.register(email, password, name, role);
      
      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'register' }, duration);

      res.status(201).json(result);
    } catch (error: unknown) {
      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'register' }, duration);

      this.logger.error('Registration error:', error);
      const errorResponse = StandardizedErrorHandler.createErrorResponse(
        error as Error,
        req.correlationId,
        { operation: 'register', email: req.body.email }
      );
      res.status(errorResponse.error.httpStatus).json(errorResponse);
    }
  }

  async login(req: Request, res: Response) {
    const start = Date.now();
    
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      
      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'login' }, duration);

      res.json(result);
    } catch (error: unknown) {
      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'login' }, duration);

      this.logger.error('Login error:', error);
      const errorResponse = StandardizedErrorHandler.createAuthError(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials',
        req.correlationId,
        { operation: 'login', email: req.body.email }
      );
      res.status(errorResponse.error.httpStatus).json(errorResponse);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const start = Date.now();
    
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Отсутствует токен авторизации'
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = await this.authService.verifyToken(token);
      
      if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
        await this.authService.logout(decoded['userId'] as string);
      }

      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'logout' }, duration);

      res.json({ success: true });
    } catch (error: unknown) {
      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'logout' }, duration);

      this.logger.error('Logout error:', error);
      const errorResponse = StandardizedErrorHandler.createAuthError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid or expired token',
        req.correlationId,
        { operation: 'logout' }
      );
      res.status(errorResponse.error.httpStatus).json(errorResponse);
    }
  }

  async verify(req: Request, res: Response) {
    const start = Date.now();
    
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Отсутствует токен авторизации'
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = await this.authService.verifyToken(token);

      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'verify' }, duration);

      res.json({
        success: true,
        user: decoded
      });
    } catch (error: unknown) {
      const duration = (Date.now() - start) / 1000;
      authRequestDuration.observe({ operation: 'verify' }, duration);

      this.logger.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Неверный токен'
      });
    }
  }

  async statistics(_req: Request, res: Response) {
    try {
      const stats = await this.authService.getStatistics();
      res.json(stats);
    } catch (error: unknown) {
      this.logger.error('Statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }
}
