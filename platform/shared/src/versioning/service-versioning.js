import { SemanticVersioning } from './semantic-versioning';
import pino from 'pino';
export class ServiceVersioning {
    logger;
    serviceVersions = new Map();
    constructor(logger) {
        this.logger =
            logger ||
                pino({
                    level: process.env['LOG_LEVEL'] || 'info',
                });
    }
    static create(logger) {
        return new ServiceVersioning(logger);
    }
    registerService(serviceVersion) {
        this.serviceVersions.set(serviceVersion.name, serviceVersion);
        this.logger.info({
            service: serviceVersion.name,
            version: serviceVersion.version,
            environment: serviceVersion.environment,
        }, 'Service version registered');
    }
    getServiceVersion(serviceName) {
        return this.serviceVersions.get(serviceName) || null;
    }
    getAllVersions() {
        return Array.from(this.serviceVersions.values());
    }
    getVersionInfo(serviceName) {
        const serviceVersion = this.getServiceVersion(serviceName);
        if (!serviceVersion) {
            return null;
        }
        return SemanticVersioning.getInfo(serviceVersion.version);
    }
    checkCompatibility(serviceName1, serviceName2) {
        const version1 = this.getServiceVersion(serviceName1);
        const version2 = this.getServiceVersion(serviceName2);
        if (!version1 || !version2) {
            return {
                compatible: false,
                breakingChanges: false,
                featureChanges: false,
                bugfixChanges: false,
                recommendations: ['Service versions not found'],
            };
        }
        const breakingChanges = SemanticVersioning.getBreakingChanges(version1.version, version2.version);
        const featureChanges = SemanticVersioning.getFeatureChanges(version1.version, version2.version);
        const bugfixChanges = SemanticVersioning.getBugfixChanges(version1.version, version2.version);
        const recommendations = [];
        let compatible = true;
        if (breakingChanges) {
            compatible = false;
            recommendations.push('Breaking changes detected - services may not be compatible');
        }
        if (featureChanges) {
            recommendations.push('Feature changes detected - new features available');
        }
        if (bugfixChanges) {
            recommendations.push('Bugfix changes detected - bug fixes available');
        }
        if (version1.environment !== version2.environment) {
            recommendations.push('Services running in different environments');
        }
        return {
            compatible,
            breakingChanges,
            featureChanges,
            bugfixChanges,
            recommendations,
        };
    }
    getLatestVersion(serviceName) {
        const allVersions = this.getAllVersions()
            .filter(sv => sv.name === serviceName)
            .map(sv => sv.version);
        if (allVersions.length === 0) {
            return null;
        }
        return allVersions.reduce((latest, current) => SemanticVersioning.isNewer(current, latest) ? current : latest);
    }
    getStableVersions(serviceName) {
        return this.getAllVersions()
            .filter(sv => sv.name === serviceName)
            .map(sv => sv.version)
            .filter(version => SemanticVersioning.getInfo(version).isStable);
    }
    getPrereleaseVersions(serviceName) {
        return this.getAllVersions()
            .filter(sv => sv.name === serviceName)
            .map(sv => sv.version)
            .filter(version => SemanticVersioning.getInfo(version).isPrerelease);
    }
    getCompatibleVersions(serviceName, targetVersion) {
        const allVersions = this.getAllVersions()
            .filter(sv => sv.name === serviceName)
            .map(sv => sv.version);
        return SemanticVersioning.getCompatibleVersions(targetVersion, allVersions);
    }
    generateVersionReport() {
        const services = this.getAllVersions();
        const compatibility = [];
        for (let i = 0; i < services.length; i++) {
            for (let j = i + 1; j < services.length; j++) {
                const serviceI = services[i];
                const serviceJ = services[j];
                if (serviceI && serviceJ) {
                    const compat = this.checkCompatibility(serviceI.name, serviceJ.name);
                    compatibility.push({
                        service1: serviceI.name,
                        service2: serviceJ.name,
                        compatibility: compat,
                    });
                }
            }
        }
        const recommendations = [];
        const incompatibleServices = compatibility.filter(c => !c.compatibility.compatible);
        if (incompatibleServices.length > 0) {
            recommendations.push('Incompatible services detected - consider updating versions');
        }
        const servicesWithBreakingChanges = compatibility.filter(c => c.compatibility.breakingChanges);
        if (servicesWithBreakingChanges.length > 0) {
            recommendations.push('Breaking changes detected - review service compatibility');
        }
        const outdatedServices = services.filter(service => {
            const latest = this.getLatestVersion(service.name);
            return latest && SemanticVersioning.isOlder(service.version, latest);
        });
        if (outdatedServices.length > 0) {
            recommendations.push('Outdated services detected - consider updating to latest versions');
        }
        return {
            services,
            compatibility,
            recommendations,
        };
    }
    validateServiceVersion(serviceName, requiredVersion) {
        const serviceVersion = this.getServiceVersion(serviceName);
        if (!serviceVersion) {
            return false;
        }
        return SemanticVersioning.satisfies(serviceVersion.version, requiredVersion);
    }
    getServiceHealth(serviceName) {
        const serviceVersion = this.getServiceVersion(serviceName);
        if (!serviceVersion) {
            return {
                healthy: false,
                version: 'unknown',
                isLatest: false,
                isStable: false,
                issues: ['Service not registered'],
            };
        }
        const versionInfo = SemanticVersioning.getInfo(serviceVersion.version);
        const latestVersion = this.getLatestVersion(serviceName);
        const isLatest = !latestVersion || SemanticVersioning.isEqual(serviceVersion.version, latestVersion);
        const isStable = versionInfo.isStable;
        const issues = [];
        if (!isLatest) {
            issues.push('Service is not running the latest version');
        }
        if (!isStable) {
            issues.push('Service is running a prerelease version');
        }
        return {
            healthy: issues.length === 0,
            version: serviceVersion.version,
            isLatest,
            isStable,
            issues,
        };
    }
}
//# sourceMappingURL=service-versioning.js.map