export class SemanticVersioning {
    static VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    static parse(version) {
        const match = version.match(this.VERSION_REGEX);
        if (!match) {
            throw new Error(`Invalid semantic version: ${version}`);
        }
        const result = {
            major: parseInt(match[1] || '0', 10),
            minor: parseInt(match[2] || '0', 10),
            patch: parseInt(match[3] || '0', 10),
        };
        if (match[4]) {
            result.prerelease = match[4];
        }
        if (match[5]) {
            result.build = match[5];
        }
        return result;
    }
    static stringify(semantic) {
        let version = `${semantic.major}.${semantic.minor}.${semantic.patch}`;
        if (semantic.prerelease) {
            version += `-${semantic.prerelease}`;
        }
        if (semantic.build) {
            version += `+${semantic.build}`;
        }
        return version;
    }
    static compare(version1, version2) {
        const v1 = this.parse(version1);
        const v2 = this.parse(version2);
        if (v1.major !== v2.major) {
            return v1.major - v2.major;
        }
        if (v1.minor !== v2.minor) {
            return v1.minor - v2.minor;
        }
        if (v1.patch !== v2.patch) {
            return v1.patch - v2.patch;
        }
        if (v1.prerelease && !v2.prerelease) {
            return -1;
        }
        if (!v1.prerelease && v2.prerelease) {
            return 1;
        }
        if (v1.prerelease && v2.prerelease) {
            return v1.prerelease.localeCompare(v2.prerelease);
        }
        return 0;
    }
    static isNewer(version1, version2) {
        return this.compare(version1, version2) > 0;
    }
    static isOlder(version1, version2) {
        return this.compare(version1, version2) < 0;
    }
    static isEqual(version1, version2) {
        return this.compare(version1, version2) === 0;
    }
    static getInfo(version) {
        const semantic = this.parse(version);
        return {
            version,
            semantic,
            isStable: !semantic.prerelease && !semantic.build,
            isPrerelease: !!semantic.prerelease,
            isBuild: !!semantic.build,
        };
    }
    static incrementMajor(version) {
        const semantic = this.parse(version);
        return this.stringify({
            major: semantic.major + 1,
            minor: 0,
            patch: 0,
        });
    }
    static incrementMinor(version) {
        const semantic = this.parse(version);
        return this.stringify({
            major: semantic.major,
            minor: semantic.minor + 1,
            patch: 0,
        });
    }
    static incrementPatch(version) {
        const semantic = this.parse(version);
        return this.stringify({
            major: semantic.major,
            minor: semantic.minor,
            patch: semantic.patch + 1,
        });
    }
    static createPrerelease(version, prerelease) {
        const semantic = this.parse(version);
        return this.stringify({
            ...semantic,
            prerelease,
        });
    }
    static createBuild(version, build) {
        const semantic = this.parse(version);
        return this.stringify({
            ...semantic,
            build,
        });
    }
    static satisfies(version, range) {
        if (range === '*') {
            return true;
        }
        if (range.startsWith('^')) {
            const targetVersion = range.slice(1);
            const target = this.parse(targetVersion);
            const current = this.parse(version);
            if (current.major !== target.major) {
                return false;
            }
            return this.compare(version, targetVersion) >= 0;
        }
        if (range.startsWith('~')) {
            const targetVersion = range.slice(1);
            const target = this.parse(targetVersion);
            const current = this.parse(version);
            if (current.major !== target.major || current.minor !== target.minor) {
                return false;
            }
            return this.compare(version, targetVersion) >= 0;
        }
        if (range.includes(' - ')) {
            const [min, max] = range.split(' - ').map(v => v.trim());
            return this.compare(version, min || '') >= 0 && this.compare(version, max || '') <= 0;
        }
        return this.isEqual(version, range);
    }
    static getLatestStable(versions) {
        const stableVersions = versions.filter(v => this.getInfo(v).isStable);
        if (stableVersions.length === 0) {
            return null;
        }
        return stableVersions.reduce((latest, current) => this.isNewer(current, latest) ? current : latest);
    }
    static getLatestPrerelease(versions) {
        const prereleaseVersions = versions.filter(v => this.getInfo(v).isPrerelease);
        if (prereleaseVersions.length === 0) {
            return null;
        }
        return prereleaseVersions.reduce((latest, current) => this.isNewer(current, latest) ? current : latest);
    }
    static getCompatibleVersions(version, versions) {
        const target = this.parse(version);
        return versions.filter(v => {
            const current = this.parse(v);
            return current.major === target.major;
        });
    }
    static getBreakingChanges(version1, version2) {
        const v1 = this.parse(version1);
        const v2 = this.parse(version2);
        return v2.major > v1.major;
    }
    static getFeatureChanges(version1, version2) {
        const v1 = this.parse(version1);
        const v2 = this.parse(version2);
        return v2.major === v1.major && v2.minor > v1.minor;
    }
    static getBugfixChanges(version1, version2) {
        const v1 = this.parse(version1);
        const v2 = this.parse(version2);
        return v2.major === v1.major && v2.minor === v1.minor && v2.patch > v1.patch;
    }
}
//# sourceMappingURL=semantic-versioning.js.map