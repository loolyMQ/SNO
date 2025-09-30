import pino from 'pino';
import { randomUUID } from 'crypto';
import { ContractValidator } from './contract-validator';
import { ContractTester } from './contract-tester';
import { ContractMetricsCalculator } from './contract-metrics';
export class ContractTestingEngine {
    static instance;
    contracts = new Map();
    tests = new Map();
    validations = new Map();
    logger;
    validator;
    tester;
    metricsCalculator;
    constructor() {
        this.logger = pino({
            level: process.env['LOG_LEVEL'] || 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        });
        this.validator = new ContractValidator();
        this.tester = new ContractTester();
        this.metricsCalculator = new ContractMetricsCalculator();
    }
    static getInstance() {
        if (!ContractTestingEngine.instance) {
            ContractTestingEngine.instance = new ContractTestingEngine();
        }
        return ContractTestingEngine.instance;
    }
    createContract(contract) {
        const newContract = {
            ...contract,
            id: randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.contracts.set(newContract.id, newContract);
        this.logger.info({ contractId: newContract.id, name: newContract.name }, 'Contract created');
        return newContract;
    }
    updateContract(id, updates) {
        const existing = this.contracts.get(id);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
        };
        this.contracts.set(id, updated);
        this.logger.info({ contractId: id }, 'Contract updated');
        return updated;
    }
    getContract(id) {
        return this.contracts.get(id) || null;
    }
    getAllContracts() {
        return Array.from(this.contracts.values());
    }
    getContractsByProvider(provider) {
        return Array.from(this.contracts.values()).filter(contract => contract.provider === provider);
    }
    getContractsByConsumer(consumer) {
        return Array.from(this.contracts.values()).filter(contract => contract.consumer === consumer);
    }
    async runConsumerTest(contractId, testData) {
        const contract = this.contracts.get(contractId);
        if (!contract) {
            throw new Error(`Contract ${contractId} not found`);
        }
        const test = await this.tester.runConsumerTest(contract, testData);
        this.tests.set(test.id, test);
        this.logger.info({ contractId, testId: test.id, result: test.result }, 'Consumer test executed');
        return test;
    }
    async runProviderTest(contractId, testData) {
        const contract = this.contracts.get(contractId);
        if (!contract) {
            throw new Error(`Contract ${contractId} not found`);
        }
        const test = await this.tester.runProviderTest(contract, testData);
        this.tests.set(test.id, test);
        this.logger.info({ contractId, testId: test.id, result: test.result }, 'Provider test executed');
        return test;
    }
    validateContract(contractId, validatedBy) {
        const contract = this.contracts.get(contractId);
        if (!contract) {
            throw new Error(`Contract ${contractId} not found`);
        }
        const validation = this.validator.validateContract(contract);
        validation.validatedBy = validatedBy;
        this.validations.set(contractId, validation);
        this.logger.info({
            contractId,
            isValid: validation.isValid,
            errorCount: validation.errors.length,
        }, 'Contract validation completed');
        return validation;
    }
    getContractMetrics(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract) {
            return null;
        }
        const contractTests = Array.from(this.tests.values()).filter(test => test.contractId === contractId);
        return this.metricsCalculator.calculateContractMetrics(contract, contractTests);
    }
    getOverallMetrics() {
        const contracts = Array.from(this.contracts.values());
        const tests = Array.from(this.tests.values());
        return this.metricsCalculator.calculateOverallMetrics(contracts, tests);
    }
    getTestTrends(days = 30) {
        const tests = Array.from(this.tests.values());
        return this.metricsCalculator.getTestTrends(tests, days);
    }
    getContractHealthScore(contractId) {
        const contract = this.contracts.get(contractId);
        if (!contract) {
            return null;
        }
        const tests = Array.from(this.tests.values());
        const validations = Array.from(this.validations.values());
        return this.metricsCalculator.getContractHealthScore(contract, tests, validations);
    }
    compareContracts(contractId1, contractId2) {
        const contract1 = this.contracts.get(contractId1);
        const contract2 = this.contracts.get(contractId2);
        if (!contract1 || !contract2) {
            return null;
        }
        const compatibility = this.validator.validateContractCompatibility(contract1, contract2);
        return {
            contractId: contract1.id,
            version1: contract1.version,
            version2: contract2.version,
            breakingChanges: compatibility.breakingChanges.map(change => ({
                type: 'removed_field',
                path: '',
                description: change,
                impact: 'high',
            })),
            nonBreakingChanges: compatibility.nonBreakingChanges.map(change => ({
                type: 'added_field',
                path: '',
                description: change,
            })),
            compatibility: compatibility.isCompatible
                ? 'compatible'
                : 'incompatible',
        };
    }
}
//# sourceMappingURL=engine.js.map