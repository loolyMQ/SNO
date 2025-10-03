import { z } from 'zod';

export const SecurityConfigSchema = z.object({
  jwt: z.object({
    secret: z.string(),
    expiresIn: z.string().default('1h'),
    refreshExpiresIn: z.string().default('7d'),
    issuer: z.string().default('science-map'),
    audience: z.string().default('science-map-api')
  }),
  cors: z.object({
    origin: z.array(z.string()).default(['http://localhost:3000']),
    credentials: z.boolean().default(true),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization'])
  }).default({}),
  rateLimit: z.object({
    windowMs: z.number().default(900000), // 15 minutes
    max: z.number().default(100),
    message: z.string().default('Too many requests from this IP')
  }).default({}),
  bcrypt: z.object({
    rounds: z.number().default(12)
  }).default({})
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

export const createSecurityConfig = (): SecurityConfig => {
  return SecurityConfigSchema.parse({
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'science-map',
      audience: process.env.JWT_AUDIENCE || 'science-map-api'
    },
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
      allowedHeaders: (process.env.CORS_HEADERS || 'Content-Type,Authorization').split(',')
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
    }
  });
};
