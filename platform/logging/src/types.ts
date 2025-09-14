export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface BusinessEvent {
  event: string;
  entity: string;
  entityId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorContext extends LogContext {
  error: Error;
  stack?: string;
  code?: string;
  statusCode?: number;
}

export interface MetricsContext extends LogContext {
  metric: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}
