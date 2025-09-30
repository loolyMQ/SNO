export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
}
export interface VersionInfo {
    version: string;
    semantic: SemanticVersion;
    isStable: boolean;
    isPrerelease: boolean;
    isBuild: boolean;
}
export declare class SemanticVersioning {
    private static readonly VERSION_REGEX;
    static parse(version: string): SemanticVersion;
    static stringify(semantic: SemanticVersion): string;
    static compare(version1: string, version2: string): number;
    static isNewer(version1: string, version2: string): boolean;
    static isOlder(version1: string, version2: string): boolean;
    static isEqual(version1: string, version2: string): boolean;
    static getInfo(version: string): VersionInfo;
    static incrementMajor(version: string): string;
    static incrementMinor(version: string): string;
    static incrementPatch(version: string): string;
    static createPrerelease(version: string, prerelease: string): string;
    static createBuild(version: string, build: string): string;
    static satisfies(version: string, range: string): boolean;
    static getLatestStable(versions: string[]): string | null;
    static getLatestPrerelease(versions: string[]): string | null;
    static getCompatibleVersions(version: string, versions: string[]): string[];
    static getBreakingChanges(version1: string, version2: string): boolean;
    static getFeatureChanges(version1: string, version2: string): boolean;
    static getBugfixChanges(version1: string, version2: string): boolean;
}
//# sourceMappingURL=semantic-versioning.d.ts.map