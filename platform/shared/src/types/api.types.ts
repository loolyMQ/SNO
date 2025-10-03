export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters?: ApiParameter[];
  responses: ApiResponseSchema[];
  security?: ApiSecurity[];
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'body';
  required: boolean;
  type: string;
  description?: string;
  example?: unknown;
}

export interface ApiResponseSchema {
  status: number;
  description: string;
  schema?: unknown;
  headers?: Record<string, string>;
}

export interface ApiSecurity {
  type: 'bearer' | 'apiKey' | 'oauth2';
  name?: string;
  in?: 'header' | 'query';
  scheme?: string;
}

export interface ApiDocumentation {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  security: ApiSecurity[];
}

export interface ApiRateLimit {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface ApiCors {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface ApiMiddleware {
  name: string;
  order: number;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ApiHealthCheck {
  name: string;
  url: string;
  interval: number;
  timeout: number;
  retries: number;
  enabled: boolean;
}
