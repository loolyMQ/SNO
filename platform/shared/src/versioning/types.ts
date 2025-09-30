export enum VersioningStrategy {
  URL_PATH = 'url_path',
  HEADER = 'header',
  QUERY_PARAM = 'query_param',
  ACCEPT_HEADER = 'accept_header',
}

export enum VersionStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  SUNSET = 'sunset',
  BETA = 'beta',
  ALPHA = 'alpha',
}

export interface ApiVersion {
  version: string;
  status: VersionStatus;
  releaseDate: number;
  deprecationDate?: number;
  sunsetDate?: number;
  description?: string;
  breakingChanges: string[];
  newFeatures: string[];
  bugFixes: string[];
  migrationGuide?: string;
}

export interface VersioningConfig {
  strategy: VersioningStrategy;
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  sunsetVersions: string[];
  versionHeader: string;
  versionParam: string;
  acceptHeaderPrefix: string;
}

export interface VersionedRequest {
  version: string;
  originalPath: string;
  versionedPath: string;
  strategy: VersioningStrategy;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
}

export interface VersionedResponse {
  version: string;
  data: unknown;
  metadata: {
    version: string;
    status: VersionStatus;
    deprecationWarning?: string;
    sunsetWarning?: string;
  };
}

export interface VersionCompatibility {
  fromVersion: string;
  toVersion: string;
  breakingChanges: string[];
  migrationSteps: string[];
  compatibility: 'full' | 'partial' | 'none';
}

export interface VersionMetrics {
  version: string;
  requests: number;
  errors: number;
  averageResponseTime: number;
  lastUsed: number;
  userAgents: string[];
}
