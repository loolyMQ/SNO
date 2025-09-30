import { Secret, SecretType, SecretPolicy } from './types';
export declare class SecretValidator {
    validateSecret(secret: Partial<Secret>): {
        isValid: boolean;
        errors: string[];
    };
    validateSecretAgainstPolicy(secret: Secret, policy: SecretPolicy): {
        valid: boolean;
        errors: string[];
    };
    validateSecretName(name: string): {
        isValid: boolean;
        errors: string[];
    };
    validateSecretValue(value: string, type: SecretType): {
        isValid: boolean;
        errors: string[];
    };
    getPolicyForType(type: SecretType): SecretPolicy | null;
}
//# sourceMappingURL=secret-validator.d.ts.map