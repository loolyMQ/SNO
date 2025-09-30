export interface CommonDependency {
    name: string;
    version: string;
    type: 'production' | 'development';
    category: 'framework' | 'database' | 'logging' | 'security' | 'monitoring' | 'validation' | 'messaging' | 'caching' | 'testing' | 'build';
    description: string;
    required: boolean;
    alternatives?: string[];
}
export interface DependencyConfig {
    framework: CommonDependency[];
    database: CommonDependency[];
    logging: CommonDependency[];
    security: CommonDependency[];
    monitoring: CommonDependency[];
    validation: CommonDependency[];
    messaging: CommonDependency[];
    caching: CommonDependency[];
    testing: CommonDependency[];
    build: CommonDependency[];
}
export declare class CommonDependencies {
    private static readonly DEPENDENCIES;
    static getDependencies(): DependencyConfig;
    static getDependenciesByCategory(category: keyof DependencyConfig): CommonDependency[];
    static getDependency(name: string): CommonDependency | null;
    static getRequiredDependencies(): CommonDependency[];
    static getProductionDependencies(): CommonDependency[];
    static getDevelopmentDependencies(): CommonDependency[];
    static generatePackageJson(_serviceName: string, additionalDependencies?: string[]): {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    };
    static validateDependencies(serviceDependencies: Record<string, string>): {
        valid: boolean;
        issues: string[];
        recommendations: string[];
    };
    private static isVersionCompatible;
    static getDependencyReport(): {
        total: number;
        byCategory: Record<string, number>;
        byType: Record<string, number>;
        required: number;
        optional: number;
    };
}
//# sourceMappingURL=common-dependencies.d.ts.map