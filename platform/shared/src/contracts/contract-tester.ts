import { Contract, ContractTest, TestResult } from './types';

export class ContractTester {
  async runConsumerTest(contract: Contract, testData: unknown): Promise<ContractTest> {
    const test: ContractTest = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contractId: contract.id,
      name: `Consumer test for ${contract.name}`,
      testType: 'consumer',
      testData,
      expectedResult: null,
      result: TestResult.SKIPPED,
      executedAt: Date.now(),
      duration: 0,
    };

    try {
      if (contract.schema.request) {
        const requestValidation = this.validateAgainstSchema(
          testData,
          contract.schema.request as unknown as Record<string, unknown>
        );
        if (!requestValidation.isValid) {
          test.result = TestResult.FAILED;
          test.error = `Request validation failed: ${requestValidation.errors.join(', ')}`;
          return test;
        }
      }

      if (contract.schema.response) {
        const responseValidation = this.validateAgainstSchema(
          testData,
          contract.schema.response as unknown as Record<string, unknown>
        );
        if (!responseValidation.isValid) {
          test.result = TestResult.FAILED;
          test.error = `Response validation failed: ${responseValidation.errors.join(', ')}`;
          return test;
        }
      }

      test.result = TestResult.PASSED;
      return test;
    } catch (error) {
      test.result = TestResult.FAILED;
      test.error = error instanceof Error ? error.message : 'Unknown error';
      return test;
    }
  }

  async runProviderTest(contract: Contract, testData: unknown): Promise<ContractTest> {
    const test: ContractTest = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contractId: contract.id,
      name: `Provider test for ${contract.name}`,
      testType: 'provider',
      testData,
      expectedResult: null,
      result: TestResult.SKIPPED,
      executedAt: Date.now(),
      duration: 0,
    };

    try {
      if (contract.schema.request) {
        const requestValidation = this.validateAgainstSchema(
          testData,
          contract.schema.request as unknown as Record<string, unknown>
        );
        if (!requestValidation.isValid) {
          test.result = TestResult.FAILED;
          test.error = `Request validation failed: ${requestValidation.errors.join(', ')}`;
          return test;
        }
      }

      if (contract.schema.response) {
        const responseValidation = this.validateAgainstSchema(
          testData,
          contract.schema.response as unknown as Record<string, unknown>
        );
        if (!responseValidation.isValid) {
          test.result = TestResult.FAILED;
          test.error = `Response validation failed: ${responseValidation.errors.join(', ')}`;
          return test;
        }
      }

      test.result = TestResult.PASSED;
      return test;
    } catch (error) {
      test.result = TestResult.FAILED;
      test.error = error instanceof Error ? error.message : 'Unknown error';
      return test;
    }
  }

  private validateAgainstSchema(
    data: unknown,
    schema: Record<string, unknown>
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (schema['type'] && typeof data !== schema['type']) {
      errors.push(`Expected type ${schema['type']}, got ${typeof data}`);
    }

    if (schema['required'] && Array.isArray(schema['required'])) {
      for (const field of schema['required']) {
        if (!(data as any)[field]) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    if (schema['properties'] && typeof data === 'object' && data !== null) {
      const dataObj = data as Record<string, unknown>;
      for (const [field, fieldSchema] of Object.entries(schema['properties'])) {
        if (fieldSchema && typeof fieldSchema === 'object') {
          const fieldValidation = this.validateAgainstSchema(dataObj[field], fieldSchema);
          if (!fieldValidation.isValid) {
            errors.push(`Field '${field}': ${fieldValidation.errors.join(', ')}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
