export class CommonDependencies {
    static DEPENDENCIES = {
        framework: [
            {
                name: 'express',
                version: '^4.18.2',
                type: 'production',
                category: 'framework',
                description: 'Web framework for Node.js',
                required: true,
            },
            {
                name: 'cors',
                version: '^2.8.5',
                type: 'production',
                category: 'framework',
                description: 'CORS middleware for Express',
                required: true,
            },
            {
                name: 'helmet',
                version: '^7.1.0',
                type: 'production',
                category: 'framework',
                description: 'Security middleware for Express',
                required: true,
            },
            {
                name: 'compression',
                version: '^1.7.4',
                type: 'production',
                category: 'framework',
                description: 'Compression middleware for Express',
                required: true,
            },
            {
                name: 'express-rate-limit',
                version: '^7.1.5',
                type: 'production',
                category: 'framework',
                description: 'Rate limiting middleware for Express',
                required: true,
            },
        ],
        database: [
            {
                name: 'pg',
                version: '^8.11.3',
                type: 'production',
                category: 'database',
                description: 'PostgreSQL client for Node.js',
                required: true,
            },
            {
                name: '@prisma/client',
                version: '^5.6.0',
                type: 'production',
                category: 'database',
                description: 'Prisma database client',
                required: true,
            },
            {
                name: 'prisma',
                version: '^5.6.0',
                type: 'development',
                category: 'database',
                description: 'Prisma database toolkit',
                required: true,
            },
        ],
        logging: [
            {
                name: 'pino',
                version: '^8.16.2',
                type: 'production',
                category: 'logging',
                description: 'Fast JSON logger for Node.js',
                required: true,
            },
            {
                name: 'pino-http',
                version: '^8.5.1',
                type: 'production',
                category: 'logging',
                description: 'HTTP logging middleware for Pino',
                required: true,
            },
            {
                name: 'pino-pretty',
                version: '^10.2.3',
                type: 'development',
                category: 'logging',
                description: 'Pretty printer for Pino logs',
                required: false,
            },
        ],
        security: [
            {
                name: 'bcrypt',
                version: '^5.1.1',
                type: 'production',
                category: 'security',
                description: 'Password hashing library',
                required: true,
            },
            {
                name: 'jsonwebtoken',
                version: '^9.0.2',
                type: 'production',
                category: 'security',
                description: 'JSON Web Token implementation',
                required: true,
            },
        ],
        monitoring: [
            {
                name: 'prom-client',
                version: '^15.0.0',
                type: 'production',
                category: 'monitoring',
                description: 'Prometheus metrics client',
                required: true,
            },
            {
                name: '@opentelemetry/api',
                version: '^1.7.0',
                type: 'production',
                category: 'monitoring',
                description: 'OpenTelemetry API',
                required: true,
            },
            {
                name: '@opentelemetry/sdk-node',
                version: '^0.45.1',
                type: 'production',
                category: 'monitoring',
                description: 'OpenTelemetry SDK for Node.js',
                required: true,
            },
        ],
        validation: [
            {
                name: 'zod',
                version: '^3.22.4',
                type: 'production',
                category: 'validation',
                description: 'TypeScript-first schema validation',
                required: true,
            },
        ],
        messaging: [
            {
                name: 'kafkajs',
                version: '^2.2.4',
                type: 'production',
                category: 'messaging',
                description: 'Kafka client for Node.js',
                required: true,
            },
        ],
        caching: [
            {
                name: 'ioredis',
                version: '^5.3.2',
                type: 'production',
                category: 'caching',
                description: 'Redis client for Node.js',
                required: true,
            },
        ],
        testing: [
            {
                name: 'jest',
                version: '^29.7.0',
                type: 'development',
                category: 'testing',
                description: 'JavaScript testing framework',
                required: true,
            },
            {
                name: 'ts-jest',
                version: '^29.1.1',
                type: 'development',
                category: 'testing',
                description: 'TypeScript preprocessor for Jest',
                required: true,
            },
            {
                name: 'supertest',
                version: '^6.3.3',
                type: 'development',
                category: 'testing',
                description: 'HTTP assertion library',
                required: true,
            },
        ],
        build: [
            {
                name: 'typescript',
                version: '^5.2.2',
                type: 'development',
                category: 'build',
                description: 'TypeScript compiler',
                required: true,
            },
            {
                name: 'tsx',
                version: '^4.1.4',
                type: 'development',
                category: 'build',
                description: 'TypeScript execution engine',
                required: true,
            },
        ],
    };
    static getDependencies() {
        return this.DEPENDENCIES;
    }
    static getDependenciesByCategory(category) {
        return this.DEPENDENCIES[category];
    }
    static getDependency(name) {
        for (const category of Object.values(this.DEPENDENCIES)) {
            const dependency = category.find((dep) => dep.name === name);
            if (dependency) {
                return dependency;
            }
        }
        return null;
    }
    static getRequiredDependencies() {
        const allDependencies = [];
        for (const category of Object.values(this.DEPENDENCIES)) {
            allDependencies.push(...category.filter((dep) => dep.required));
        }
        return allDependencies;
    }
    static getProductionDependencies() {
        const allDependencies = [];
        for (const category of Object.values(this.DEPENDENCIES)) {
            allDependencies.push(...category.filter((dep) => dep.type === 'production'));
        }
        return allDependencies;
    }
    static getDevelopmentDependencies() {
        const allDependencies = [];
        for (const category of Object.values(this.DEPENDENCIES)) {
            allDependencies.push(...category.filter((dep) => dep.type === 'development'));
        }
        return allDependencies;
    }
    static generatePackageJson(_serviceName, additionalDependencies = []) {
        const dependencies = {};
        const devDependencies = {};
        // Add common dependencies
        for (const category of Object.values(this.DEPENDENCIES)) {
            for (const dep of category) {
                if (dep.type === 'production') {
                    dependencies[dep.name] = dep.version;
                }
                else {
                    devDependencies[dep.name] = dep.version;
                }
            }
        }
        // Add service-specific dependencies
        for (const dep of additionalDependencies) {
            const commonDep = this.getDependency(dep);
            if (commonDep) {
                if (commonDep.type === 'production') {
                    dependencies[commonDep.name] = commonDep.version;
                }
                else {
                    devDependencies[commonDep.name] = commonDep.version;
                }
            }
        }
        return { dependencies, devDependencies };
    }
    static validateDependencies(serviceDependencies) {
        const issues = [];
        const recommendations = [];
        for (const [name, version] of Object.entries(serviceDependencies)) {
            const commonDep = this.getDependency(name);
            if (commonDep) {
                // Check if version is compatible
                if (!this.isVersionCompatible(version, commonDep.version)) {
                    issues.push(`Incompatible version for ${name}: expected ${commonDep.version}, got ${version}`);
                }
            }
            else {
                recommendations.push(`Consider using common dependency: ${name}`);
            }
        }
        // Check for missing required dependencies
        const requiredDeps = this.getRequiredDependencies();
        for (const reqDep of requiredDeps) {
            if (!serviceDependencies[reqDep.name]) {
                issues.push(`Missing required dependency: ${reqDep.name}`);
            }
        }
        return {
            valid: issues.length === 0,
            issues,
            recommendations,
        };
    }
    static isVersionCompatible(actual, expected) {
        // Simple version compatibility check
        // In a real implementation, you'd use semver
        return actual.startsWith(expected.replace('^', '').split('.')[0] || '');
    }
    static getDependencyReport() {
        const allDependencies = [];
        for (const category of Object.values(this.DEPENDENCIES)) {
            allDependencies.push(...category);
        }
        const byCategory = {};
        const byType = {};
        for (const dep of allDependencies) {
            byCategory[dep.category] = (byCategory[dep.category] || 0) + 1;
            byType[dep.type] = (byType[dep.type] || 0) + 1;
        }
        return {
            total: allDependencies.length,
            byCategory,
            byType,
            required: allDependencies.filter(dep => dep.required).length,
            optional: allDependencies.filter(dep => !dep.required).length,
        };
    }
}
//# sourceMappingURL=common-dependencies.js.map