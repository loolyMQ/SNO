export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FilterParams {
  search?: string;
  filters?: Record<string, unknown>;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

interface CommonBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface AuditEntity extends CommonBaseEntity {
  createdBy: string;
  updatedBy: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  timestamp: Date;
  requestId?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface BulkOperationResult<T> {
  success: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}
