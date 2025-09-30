import { Contract, ContractTest, ContractValidation, ContractMetrics, ContractComparison } from './types';
export declare class ContractTestingEngine {
    private static instance;
    private contracts;
    private tests;
    private validations;
    private logger;
    private validator;
    private tester;
    private metricsCalculator;
    constructor();
    static getInstance(): ContractTestingEngine;
    createContract(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Contract;
    updateContract(id: string, updates: Partial<Contract>): Contract | null;
    getContract(id: string): Contract | null;
    getAllContracts(): Contract[];
    getContractsByProvider(provider: string): Contract[];
    getContractsByConsumer(consumer: string): Contract[];
    runConsumerTest(contractId: string, testData: unknown): Promise<ContractTest>;
    runProviderTest(contractId: string, testData: unknown): Promise<ContractTest>;
    validateContract(contractId: string, validatedBy: string): ContractValidation;
    getContractMetrics(contractId: string): ContractMetrics | null;
    getOverallMetrics(): {
        totalContracts: number;
        totalTests: number;
        overallSuccessRate: number;
        contractsWithIssues: number;
        averageTestsPerContract: number;
    };
    getTestTrends(days?: number): {
        dailyTests: Array<{
            date: string;
            tests: number;
            passed: number;
            failed: number;
        }>;
        trend: 'improving' | 'declining' | 'stable';
    };
    getContractHealthScore(contractId: string): {
        score: number;
        factors: string[];
        recommendations: string[];
    } | null;
    compareContracts(contractId1: string, contractId2: string): ContractComparison | null;
}
//# sourceMappingURL=engine.d.ts.map