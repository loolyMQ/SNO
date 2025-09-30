import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  role: z.enum(['user', 'admin', 'moderator']).optional().default('user'),
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const verifySchema = z.object({
  token: z.string().min(1, 'Токен обязателен'),
});

export const logoutSchema = z.object({
  token: z.string().min(1, 'Токен обязателен').optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').optional(),
  email: z.string().email('Некорректный email адрес').optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string().min(8, 'Новый пароль должен содержать минимум 8 символов'),
});

export const emailSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
});

export const tokenSchema = z.object({
  token: z.string().min(1, 'Токен обязателен'),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1, 'Страница должна быть больше 0'))
    .optional()
    .default('1'),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100, 'Лимит должен быть от 1 до 100'))
    .optional()
    .default('10'),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Поисковый запрос обязателен'),
  ...paginationSchema.shape,
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
});

export const correlationIdSchema = z.object({
  'x-correlation-id': z.string().optional(),
});

export const authSchemas = {
  register: registerSchema,
  login: loginSchema,
  verify: verifySchema,
  logout: logoutSchema,
  userUpdate: userUpdateSchema,
  passwordChange: passwordChangeSchema,
  email: emailSchema,
  token: tokenSchema,
  pagination: paginationSchema,
  search: searchSchema,
  idParam: idParamSchema,
  correlationId: correlationIdSchema,
};
