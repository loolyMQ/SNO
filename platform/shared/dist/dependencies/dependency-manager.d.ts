import pino from 'pino';
export interface ServiceDependencyConfig {
    serviceName: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
}
export interface DependencyAnalysis {
    serviceName: string;
    totalDependencies: number;
    totalDevDependencies: number;
    duplicates: string[];
    outdated: string[];
    missing: string[];
    incompatible: string[];
    recommendations: string[];
    score: number;
}
export declare class DependencyManager {
    private logger;
    private serviceConfigs;
    constructor(logger?: pino.Logger);
    static create(logger?: pino.Logger): DependencyManager;
    registerService(config: ServiceDependencyConfig): void;
    getServiceConfig(serviceName: string): ServiceDependencyConfig | null;
    getAllServiceConfigs(): ServiceDependencyConfig[];
    analyzeService(serviceName: string): DependencyAnalysis;
    analyzeAllServices(): DependencyAnalysis[];
    findDuplicates(): Array<{
        dependency: string;
        services: Array<{
            serviceName: string;
            version: string;
        }>;
    }>;
    generateConsolidatedPackageJson(): {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
        peerDependencies: Record<string, string>;
    };
    generateServicePackageJson(serviceName: string, additionalDependencies?: string[]): {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    };
    optimizeDependencies(): {
        consolidated: Record<string, string>;
        serviceSpecific: Record<string, Record<string, string>>;
        savings: number;
    };
    generateDependencyReport(): {
        summary: {
            totalServices: number;
            totalDependencies: number;
            duplicates: number;
            optimization: {
                current: number;
                optimized: number;
                savings: number;
            };
        };
        services: DependencyAnalysis[];
        duplicates: Array<{
            dependency: string;
            services: Array<{
                serviceName: string;
                version: string;
            }>;
        }>;
        recommendations: string[];
    };
    private isVersionCompatible;
    private isVersionNewer;
}
//# sourceMappingURL=dependency-manager.d.ts.map