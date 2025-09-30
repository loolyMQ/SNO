import { Contract, ContractValidation } from './types';
export declare class ContractValidator {
    validateContract(contract: Contract): ContractValidation;
    private isValidVersion;
    private isValidSchema;
    validateContractCompatibility(contract1: Contract, contract2: Contract): {
        isCompatible: boolean;
        breakingChanges: string[];
        nonBreakingChanges: string[];
    };
}
//# sourceMappingURL=contract-validator.d.ts.map