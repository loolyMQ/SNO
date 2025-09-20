import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware для проверки JWT токена
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Токен доступа не предоставлен',
      code: 'MISSING_TOKEN'
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';

  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Недействительный токен',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Middleware для проверки роли пользователя
 */
export function requireRole(requiredRole: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не аутентифицирован',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

/**
 * Middleware для проверки множественных ролей
 */
export function requireAnyRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не аутентифицирован',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

/**
 * Middleware для опциональной аутентификации
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET || 'default-secret-key';

  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    // Игнорируем ошибку для опциональной аутентификации
  }

  next();
}

/**
 * Middleware для проверки владения ресурсом
 */
export function requireOwnership(resourceUserIdField: string = 'userId') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не аутентифицирован',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Админы могут получить доступ к любым ресурсам
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен к чужому ресурсу',
        code: 'RESOURCE_ACCESS_DENIED'
      });
    }

    next();
  };
}

/**
 * Middleware для rate limiting
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Слишком много запросов',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
}

/**
 * Middleware для валидации входных данных
 */
export function validateInput(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Неверные входные данные',
          code: 'VALIDATION_ERROR',
          details: error.details.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Ошибка валидации',
        code: 'VALIDATION_ERROR'
      });
    }
  };
}

/**
 * Middleware для логирования запросов
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.status} (${logData.duration})`);
  });
  
  next();
}

/**
 * Middleware для обработки ошибок
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  
  // JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Недействительный токен',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Токен истек',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Ошибки валидации
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Ошибка валидации данных',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Общие ошибки сервера
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера',
    code: 'INTERNAL_SERVER_ERROR'
  });
}
