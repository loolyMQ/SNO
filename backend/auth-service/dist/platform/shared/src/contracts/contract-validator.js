export class ContractValidator {
    validateContract(contract) {
        const errors = [];
        const warnings = [];
        if (!contract.schema.request && !contract.schema.response && !contract.schema.event) {
            errors.push({
                path: 'schema',
                message: 'Contract must have at least one schema definition',
                severity: 'error',
                code: 'MISSING_SCHEMA',
            });
        }
        if (contract.examples.length === 0) {
            warnings.push({
                path: 'examples',
                message: 'Contract should have at least one example',
                suggestion: 'Add examples to improve contract clarity',
            });
        }
        if (!contract.provider || contract.provider.trim().length === 0) {
            errors.push({
                path: 'provider',
                message: 'Contract provider is required',
                severity: 'error',
                code: 'MISSING_PROVIDER',
            });
        }
        if (!contract.consumer || contract.consumer.trim().length === 0) {
            errors.push({
                path: 'consumer',
                message: 'Contract consumer is required',
                severity: 'error',
                code: 'MISSING_CONSUMER',
            });
        }
        if (contract.version && !this.isValidVersion(contract.version)) {
            errors.push({
                path: 'version',
                message: 'Contract version must follow semantic versioning (e.g., 1.0.0)',
                severity: 'error',
                code: 'INVALID_VERSION',
            });
        }
        if (contract.schema.request && !this.isValidSchema(contract.schema.request)) {
            errors.push({
                path: 'schema.request',
                message: 'Request schema must be a valid JSON schema',
                severity: 'error',
                code: 'INVALID_REQUEST_SCHEMA',
            });
        }
        if (contract.schema.response && !this.isValidSchema(contract.schema.response)) {
            errors.push({
                path: 'schema.response',
                message: 'Response schema must be a valid JSON schema',
                severity: 'error',
                code: 'INVALID_RESPONSE_SCHEMA',
            });
        }
        if (contract.schema.event && !this.isValidSchema(contract.schema.event)) {
            errors.push({
                path: 'schema.event',
                message: 'Event schema must be a valid JSON schema',
                severity: 'error',
                code: 'INVALID_EVENT_SCHEMA',
            });
        }
        return {
            contractId: contract.id,
            isValid: errors.length === 0,
            errors,
            warnings,
            validatedAt: Date.now(),
            validatedBy: 'system',
        };
    }
    isValidVersion(version) {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        return versionRegex.test(version);
    }
    isValidSchema(schema) {
        if (!schema || typeof schema !== 'object') {
            return false;
        }
        if (schema.type &&
            typeof schema.type !== 'string') {
            return false;
        }
        if (schema.properties &&
            typeof schema.properties !== 'object') {
            return false;
        }
        return true;
    }
    validateContractCompatibility(contract1, contract2) {
        const breakingChanges = [];
        const nonBreakingChanges = [];
        if (contract1.version !== contract2.version) {
            nonBreakingChanges.push(`Version changed from ${contract1.version} to ${contract2.version}`);
        }
        if (JSON.stringify(contract1.schema.request) !== JSON.stringify(contract2.schema.request)) {
            breakingChanges.push('Request schema has changed');
        }
        if (JSON.stringify(contract1.schema.response) !== JSON.stringify(contract2.schema.response)) {
            breakingChanges.push('Response schema has changed');
        }
        if (JSON.stringify(contract1.schema.event) !== JSON.stringify(contract2.schema.event)) {
            breakingChanges.push('Event schema has changed');
        }
        return {
            isCompatible: breakingChanges.length === 0,
            breakingChanges,
            nonBreakingChanges,
        };
    }
}
//# sourceMappingURL=contract-validator.js.map