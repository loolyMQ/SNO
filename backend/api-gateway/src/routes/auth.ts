import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authenticateToken, requireRole, validateInput, rateLimit } from '../middleware/auth';
import Joi from 'joi';

const router = Router();
const authService = new AuthService();

// Rate limiting для аутентификации
const authRateLimit = rateLimit(5, 15 * 60 * 1000); // 5 попыток за 15 минут

// Схемы валидации
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/).required(),
  name: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('user', 'researcher', 'admin').default('user')
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/).required()
});

/**
 * POST /api/auth/login
 * Вход в систему
 */
router.post('/login', authRateLimit, validateInput(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Здесь должна быть проверка пользователя в базе данных
    // Для демонстрации используем моковые данные
    const mockUser = {
      id: '1',
      email: email,
      password: '$2b$10$example', // Хешированный пароль
      name: 'Test User',
      role: 'user'
    };

    // Проверяем пароль
    const isValidPassword = await authService.comparePassword(password, mockUser.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Генерируем токены
    const accessToken = authService.generateToken(mockUser);
    const refreshToken = authService.generateRefreshToken(mockUser);

    res.json({
      success: true,
      data: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role
        },
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка входа в систему',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', authRateLimit, validateInput(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Проверяем, существует ли пользователь
    // Здесь должна быть проверка в базе данных
    const userExists = false; // Моковая проверка

    if (userExists) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже существует',
        code: 'USER_EXISTS'
      });
    }

    // Хешируем пароль
    const hashedPassword = await authService.hashPassword(password);

    // Создаем пользователя
    const newUser = {
      id: Date.now().toString(), // Временный ID
      email,
      password: hashedPassword,
      name,
      role: role || 'user'
    };

    // Генерируем токены
    const accessToken = authService.generateToken(newUser);
    const refreshToken = authService.generateRefreshToken(newUser);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        },
        accessToken,
        refreshToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка регистрации',
      code: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Обновление токена доступа
 */
router.post('/refresh', validateInput(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Проверяем refresh token
    const payload = authService.verifyRefreshToken(refreshToken);
    
    // Получаем пользователя из базы данных
    const mockUser = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };

    // Генерируем новый access token
    const newAccessToken = authService.generateToken(mockUser);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Недействительный refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

/**
 * POST /api/auth/logout
 * Выход из системы
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Здесь можно добавить логику для добавления токена в черный список
    // или удаления refresh token из базы данных
    
    res.json({
      success: true,
      message: 'Успешный выход из системы'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выхода из системы',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Получаем пользователя из базы данных
    const mockUser = {
      id: req.user?.id,
      email: req.user?.email,
      name: 'Test User',
      role: req.user?.role
    };

    res.json({
      success: true,
      data: {
        user: mockUser
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения информации о пользователе',
      code: 'GET_USER_ERROR'
    });
  }
});

/**
 * PUT /api/auth/change-password
 * Смена пароля
 */
router.put('/change-password', authenticateToken, validateInput(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    // Получаем пользователя из базы данных
    const mockUser = {
      id: userId,
      email: req.user?.email,
      password: '$2b$10$example' // Хешированный пароль
    };

    // Проверяем текущий пароль
    const isValidPassword = await authService.comparePassword(currentPassword, mockUser.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Неверный текущий пароль',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Хешируем новый пароль
    const hashedNewPassword = await authService.hashPassword(newPassword);

    // Обновляем пароль в базе данных
    // Здесь должна быть логика обновления в БД

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка смены пароля',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

/**
 * GET /api/auth/verify-token
 * Проверка валидности токена
 */
router.get('/verify-token', authenticateToken, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      valid: true,
      user: req.user
    }
  });
});

export { router as authRoutes };
