import { ApiVersion, VersioningConfig, VersionedRequest, VersionedResponse, VersionCompatibility, VersionMetrics } from './types';
export declare class VersioningEngine {
    private static instance;
    private versions;
    private config;
    private logger;
    private metrics;
    constructor(config: VersioningConfig);
    static getInstance(config?: VersioningConfig): VersioningEngine;
    addVersion(version: ApiVersion): void;
    updateVersion(version: string, updates: Partial<ApiVersion>): void;
    getVersion(version: string): ApiVersion | undefined;
    getAllVersions(): ApiVersion[];
    getActiveVersions(): ApiVersion[];
    getDeprecatedVersions(): ApiVersion[];
    parseVersionFromRequest(req: {
        path: string;
        headers: Record<string, string | string[] | undefined>;
        query: Record<string, string | string[] | undefined>;
    }): VersionedRequest;
    createVersionedResponse(version: string, data: unknown): VersionedResponse;
    checkCompatibility(fromVersion: string, toVersion: string): VersionCompatibility;
    recordVersionUsage(version: string, userAgent?: string): void;
    getVersionMetrics(version?: string): VersionMetrics[];
    private extractVersion;
    private extractFromUrlPath;
    private extractFromHeader;
    private extractFromQueryParam;
    private extractFromAcceptHeader;
    private buildVersionedPath;
    private findBreakingChanges;
    private generateMigrationSteps;
    validateVersion(version: string): boolean;
    isVersionDeprecated(version: string): boolean;
    isVersionSunset(version: string): boolean;
    getDefaultVersion(): string;
    getSupportedVersions(): string[];
    getDeprecatedVersionStrings(): string[];
    getSunsetVersions(): string[];
}
//# sourceMappingURL=engine.d.ts.map