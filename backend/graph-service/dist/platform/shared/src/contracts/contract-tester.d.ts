import { Contract, ContractTest } from './types';
export declare class ContractTester {
    runConsumerTest(contract: Contract, testData: unknown): Promise<ContractTest>;
    runProviderTest(contract: Contract, testData: unknown): Promise<ContractTest>;
    private validateAgainstSchema;
}
//# sourceMappingURL=contract-tester.d.ts.map