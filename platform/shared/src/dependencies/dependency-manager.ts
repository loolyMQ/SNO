import { CommonDependencies } from './common-dependencies';
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

export class DependencyManager {
  private logger: pino.Logger;
  private serviceConfigs: Map<string, ServiceDependencyConfig> = new Map();

  constructor(logger?: pino.Logger) {
    this.logger =
      logger ||
      pino({
        level: process.env['LOG_LEVEL'] || 'info',
      });
  }

  static create(logger?: pino.Logger): DependencyManager {
    return new DependencyManager(logger);
  }

  registerService(config: ServiceDependencyConfig): void {
    this.serviceConfigs.set(config.serviceName, config);
    this.logger.info(
      {
        service: config.serviceName,
        dependencies: Object.keys(config.dependencies).length,
        devDependencies: Object.keys(config.devDependencies).length,
      },
      'Service dependencies registered'
    );
  }

  getServiceConfig(serviceName: string): ServiceDependencyConfig | null {
    return this.serviceConfigs.get(serviceName) || null;
  }

  getAllServiceConfigs(): ServiceDependencyConfig[] {
    return Array.from(this.serviceConfigs.values());
  }

  analyzeService(serviceName: string): DependencyAnalysis {
    const config = this.getServiceConfig(serviceName);
    if (!config) {
      return {
        serviceName,
        totalDependencies: 0,
        totalDevDependencies: 0,
        duplicates: [],
        outdated: [],
        missing: [],
        incompatible: [],
        recommendations: [],
        score: 0,
      };
    }

    const allDependencies = { ...config.dependencies, ...config.devDependencies };
    // const commonDeps = CommonDependencies.getDependencies();

    const duplicates: string[] = [];
    const outdated: string[] = [];
    const missing: string[] = [];
    const incompatible: string[] = [];
    const recommendations: string[] = [];

    // Check for duplicates across services
    for (const [depName, depVersion] of Object.entries(allDependencies)) {
      const otherServices = this.getAllServiceConfigs().filter(s => s.serviceName !== serviceName);
      for (const otherService of otherServices) {
        const otherDeps = { ...otherService.dependencies, ...otherService.devDependencies };
        if (otherDeps[depName] && otherDeps[depName] !== depVersion) {
          duplicates.push(
            `${depName}: ${depVersion} vs ${otherDeps[depName]} in ${otherService.serviceName}`
          );
        }
      }
    }

    // Check for missing common dependencies
    const requiredDeps = CommonDependencies.getRequiredDependencies();
    for (const reqDep of requiredDeps) {
      if (!allDependencies[reqDep.name]) {
        missing.push(reqDep.name);
      }
    }

    // Check for incompatible versions
    for (const [depName, depVersion] of Object.entries(allDependencies)) {
      const commonDep = CommonDependencies.getDependency(depName);
      if (commonDep && !this.isVersionCompatible(depVersion, commonDep.version)) {
        incompatible.push(`${depName}: ${depVersion} (expected ${commonDep.version})`);
      }
    }

    // Generate recommendations
    for (const [depName, depVersion] of Object.entries(allDependencies)) {
      const commonDep = CommonDependencies.getDependency(depName);
      if (commonDep) {
        if (depVersion !== commonDep.version) {
          recommendations.push(`Update ${depName} from ${depVersion} to ${commonDep.version}`);
        }
      } else {
        recommendations.push(`Consider using common dependency for ${depName}`);
      }
    }

    // Calculate score
    const totalIssues = duplicates.length + outdated.length + missing.length + incompatible.length;
    const maxPossibleIssues = Object.keys(allDependencies).length + requiredDeps.length;
    const score = Math.max(
      0,
      Math.round(((maxPossibleIssues - totalIssues) / maxPossibleIssues) * 100)
    );

    return {
      serviceName,
      totalDependencies: Object.keys(config.dependencies).length,
      totalDevDependencies: Object.keys(config.devDependencies).length,
      duplicates,
      outdated,
      missing,
      incompatible,
      recommendations,
      score,
    };
  }

  analyzeAllServices(): DependencyAnalysis[] {
    return Array.from(this.serviceConfigs.keys()).map(serviceName =>
      this.analyzeService(serviceName)
    );
  }

  findDuplicates(): Array<{
    dependency: string;
    services: Array<{
      serviceName: string;
      version: string;
    }>;
  }> {
    const dependencyMap = new Map<string, Array<{ serviceName: string; version: string }>>();

    for (const config of this.getAllServiceConfigs()) {
      const allDeps = { ...config.dependencies, ...config.devDependencies };
      for (const [depName, depVersion] of Object.entries(allDeps)) {
        if (!dependencyMap.has(depName)) {
          dependencyMap.set(depName, []);
        }
        dependencyMap.get(depName)!.push({
          serviceName: config.serviceName,
          version: depVersion,
        });
      }
    }

    const duplicates: Array<{
      dependency: string;
      services: Array<{ serviceName: string; version: string }>;
    }> = [];

    for (const [depName, services] of dependencyMap.entries()) {
      if (services.length > 1) {
        duplicates.push({
          dependency: depName,
          services,
        });
      }
    }

    return duplicates;
  }

  generateConsolidatedPackageJson(): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
  } {
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};
    const peerDependencies: Record<string, string> = {};

    // Collect all dependencies from all services
    for (const config of this.getAllServiceConfigs()) {
      for (const [depName, depVersion] of Object.entries(config.dependencies)) {
        if (!dependencies[depName] || this.isVersionNewer(depVersion, dependencies[depName])) {
          dependencies[depName] = depVersion;
        }
      }
      for (const [depName, depVersion] of Object.entries(config.devDependencies)) {
        if (
          !devDependencies[depName] ||
          this.isVersionNewer(depVersion, devDependencies[depName])
        ) {
          devDependencies[depName] = depVersion;
        }
      }
    }

    return { dependencies, devDependencies, peerDependencies };
  }

  generateServicePackageJson(
    serviceName: string,
    additionalDependencies: string[] = []
  ): {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  } {
    const commonDeps = CommonDependencies.generatePackageJson(serviceName, additionalDependencies);
    return commonDeps;
  }

  optimizeDependencies(): {
    consolidated: Record<string, string>;
    serviceSpecific: Record<string, Record<string, string>>;
    savings: number;
  } {
    const consolidated = this.generateConsolidatedPackageJson();
    const serviceSpecific: Record<string, Record<string, string>> = {};

    let totalDependencies = 0;
    let consolidatedDependencies = 0;

    for (const config of this.getAllServiceConfigs()) {
      const allDeps = { ...config.dependencies, ...config.devDependencies };
      totalDependencies += Object.keys(allDeps).length;

      const serviceDeps: Record<string, string> = {};
      for (const [depName, depVersion] of Object.entries(allDeps)) {
        if (!consolidated.dependencies[depName] && !consolidated.devDependencies[depName]) {
          serviceDeps[depName] = depVersion;
        }
      }
      serviceSpecific[config.serviceName] = serviceDeps;
    }

    consolidatedDependencies =
      Object.keys(consolidated.dependencies).length +
      Object.keys(consolidated.devDependencies).length;

    const savings = totalDependencies - consolidatedDependencies;

    return {
      consolidated: consolidated.dependencies,
      serviceSpecific,
      savings,
    };
  }

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
      services: Array<{ serviceName: string; version: string }>;
    }>;
    recommendations: string[];
  } {
    const services = this.analyzeAllServices();
    const duplicates = this.findDuplicates();
    const optimization = this.optimizeDependencies();

    const totalDependencies = services.reduce(
      (sum, service) => sum + service.totalDependencies + service.totalDevDependencies,
      0
    );

    const recommendations: string[] = [];

    // Add optimization recommendations
    if (optimization.savings > 0) {
      recommendations.push(`Consolidate ${optimization.savings} duplicate dependencies`);
    }

    // Add service-specific recommendations
    for (const service of services) {
      if (service.score < 80) {
        recommendations.push(
          `Improve ${service.serviceName} dependency management (score: ${service.score})`
        );
      }
    }

    return {
      summary: {
        totalServices: services.length,
        totalDependencies,
        duplicates: duplicates.length,
        optimization: {
          current: totalDependencies,
          optimized: Object.keys(optimization.consolidated).length,
          savings: optimization.savings,
        },
      },
      services,
      duplicates,
      recommendations,
    };
  }

  private isVersionCompatible(actual: string, expected: string): boolean {
    // Simple version compatibility check
    return actual.startsWith(expected.replace('^', '').split('.')[0] || '');
  }

  private isVersionNewer(version1: string, version2: string): boolean {
    // Simple version comparison
    const v1 = version1.replace('^', '').split('.').map(Number);
    const v2 = version2.replace('^', '').split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
    return false;
  }
}
