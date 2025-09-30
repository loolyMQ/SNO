import { Contract, ContractTest, ContractValidation, ContractMetrics } from './types';
export declare class ContractMetricsCalculator {
    calculateContractMetrics(contract: Contract, tests: ContractTest[]): ContractMetrics;
    calculateOverallMetrics(contracts: Contract[], tests: ContractTest[]): {
        totalContracts: number;
        totalTests: number;
        overallSuccessRate: number;
        contractsWithIssues: number;
        averageTestsPerContract: number;
    };
    getTestTrends(tests: ContractTest[], days?: number): {
        dailyTests: Array<{
            date: string;
            tests: number;
            passed: number;
            failed: number;
        }>;
        trend: 'improving' | 'declining' | 'stable';
    };
    getContractHealthScore(contract: Contract, tests: ContractTest[], validations: ContractValidation[]): {
        score: number;
        factors: string[];
        recommendations: string[];
    };
}
//# sourceMappingURL=contract-metrics.d.ts.map