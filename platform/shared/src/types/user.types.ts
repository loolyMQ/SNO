export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  preferences: UserPreferences;
  roles: UserRole[];
  permissions: Permission[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showLastSeen: boolean;
  allowDirectMessages: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface UserProfile {
  userId: string;
  bio?: string;
  website?: string;
  location?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  interests: string[];
  skills: string[];
  education: Education[];
  experience: Experience[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

export interface Experience {
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  current: boolean;
}

export interface UserStats {
  userId: string;
  totalLogins: number;
  lastLoginAt?: Date;
  totalSessions: number;
  averageSessionDuration: number;
  totalActivity: number;
  createdAt: Date;
  updatedAt: Date;
}
