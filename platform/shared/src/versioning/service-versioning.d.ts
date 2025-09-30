import { SemanticVersion, VersionInfo } from './semantic-versioning';
import pino from 'pino';
export interface ServiceVersion {
    name: string;
    version: string;
    semantic: SemanticVersion;
    buildTime: string;
    gitCommit?: string;
    gitBranch?: string;
    environment: string;
    dependencies: Record<string, string>;
}
export interface VersionCompatibility {
    compatible: boolean;
    breakingChanges: boolean;
    featureChanges: boolean;
    bugfixChanges: boolean;
    recommendations: string[];
}
export declare class ServiceVersioning {
    private logger;
    private serviceVersions;
    constructor(logger?: pino.Logger);
    static create(logger?: pino.Logger): ServiceVersioning;
    registerService(serviceVersion: ServiceVersion): void;
    getServiceVersion(serviceName: string): ServiceVersion | null;
    getAllVersions(): ServiceVersion[];
    getVersionInfo(serviceName: string): VersionInfo | null;
    checkCompatibility(serviceName1: string, serviceName2: string): VersionCompatibility;
    getLatestVersion(serviceName: string): string | null;
    getStableVersions(serviceName: string): string[];
    getPrereleaseVersions(serviceName: string): string[];
    getCompatibleVersions(serviceName: string, targetVersion: string): string[];
    generateVersionReport(): {
        services: ServiceVersion[];
        compatibility: Array<{
            service1: string;
            service2: string;
            compatibility: VersionCompatibility;
        }>;
        recommendations: string[];
    };
    validateServiceVersion(serviceName: string, requiredVersion: string): boolean;
    getServiceHealth(serviceName: string): {
        healthy: boolean;
        version: string;
        isLatest: boolean;
        isStable: boolean;
        issues: string[];
    };
}
//# sourceMappingURL=service-versioning.d.ts.map