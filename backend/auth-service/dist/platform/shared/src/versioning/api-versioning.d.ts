import { Request, Response, NextFunction } from 'express';
export interface ApiVersion {
    version: string;
    supported: boolean;
    deprecated: boolean;
    sunsetDate?: string;
    migrationGuide?: string;
}
export interface VersioningConfig {
    defaultVersion: string;
    supportedVersions: string[];
    deprecatedVersions: string[];
    versioningStrategy: 'url' | 'header' | 'query';
    headerName?: string;
    queryParamName?: string;
}
export declare class ApiVersioning {
    private static readonly DEFAULT_CONFIG;
    private config;
    private versions;
    constructor(config?: Partial<VersioningConfig>);
    private initializeVersions;
    static createVersioning(config?: Partial<VersioningConfig>): ApiVersioning;
    static createUrlVersioning(): ApiVersioning;
    static createHeaderVersioning(): ApiVersioning;
    static createQueryVersioning(): ApiVersioning;
    middleware(): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    private extractVersion;
    private extractFromUrl;
    private extractFromHeader;
    private extractFromQuery;
    private isVersionSupported;
    private isVersionDeprecated;
    private getSunsetDate;
    private getMigrationGuide;
    addVersion(version: string, config?: Partial<ApiVersion>): void;
    deprecateVersion(version: string, sunsetDate?: string, migrationGuide?: string): void;
    getVersionInfo(version: string): ApiVersion | null;
    getAllVersions(): ApiVersion[];
    getSupportedVersions(): string[];
    getDeprecatedVersions(): string[];
    getDefaultVersion(): string;
    createVersionedRoute(version: string, route: string): string;
    createVersionedRoutes(route: string): string[];
    getVersionFromRequest(req: Request): string;
}
declare global {
    namespace Express {
        interface Request {
            apiVersion?: string;
        }
    }
}
//# sourceMappingURL=api-versioning.d.ts.map