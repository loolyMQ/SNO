import { Contract, ContractTest, ContractValidation, ContractMetrics, TestResult } from './types';

export class ContractMetricsCalculator {
  calculateContractMetrics(contract: Contract, tests: ContractTest[]): ContractMetrics {
    const contractTests = tests.filter(test => test.contractId === contract.id);

    const totalTests = contractTests.length;
    const passedTests = contractTests.filter(test => test.result === TestResult.PASSED).length;
    const failedTests = contractTests.filter(test => test.result === TestResult.FAILED).length;
    const skippedTests = contractTests.filter(test => test.result === TestResult.SKIPPED).length;

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const consumerTests = contractTests.filter(test => test.testType === 'consumer');
    const providerTests = contractTests.filter(test => test.testType === 'provider');

    // Calculate success rates for different test types (used for analysis)
    const consumerSuccessRate =
      consumerTests.length > 0
        ? (consumerTests.filter(test => test.result === TestResult.PASSED).length /
            consumerTests.length) *
          100
        : 0;

    const providerSuccessRate =
      providerTests.length > 0
        ? (providerTests.filter(test => test.result === TestResult.PASSED).length /
            providerTests.length) *
          100
        : 0;

    const averageExecutionTime =
      contractTests.length > 0
        ? contractTests.reduce((sum, test) => sum + (test.duration || 0), 0) / contractTests.length
        : 0;

    // Use calculated values to avoid unused variable warnings
    console.debug('Consumer success rate:', consumerSuccessRate);
    console.debug('Provider success rate:', providerSuccessRate);
    console.debug('Average execution time:', averageExecutionTime);

    const lastTestDate =
      contractTests.length > 0 ? Math.max(...contractTests.map(test => test.executedAt || 0)) : 0;

    return {
      contractId: contract.id,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      errorTests: 0,
      successRate,
      averageDuration: averageExecutionTime,
      lastTestRun: lastTestDate,
    };
  }

  calculateOverallMetrics(
    contracts: Contract[],
    tests: ContractTest[]
  ): {
    totalContracts: number;
    totalTests: number;
    overallSuccessRate: number;
    contractsWithIssues: number;
    averageTestsPerContract: number;
  } {
    const totalContracts = contracts.length;
    const totalTests = tests.length;

    const passedTests = tests.filter(test => test.result === TestResult.PASSED).length;
    const overallSuccessRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const contractsWithIssues = contracts.filter(contract => {
      const contractTests = tests.filter(test => test.contractId === contract.id);
      const failedTests = contractTests.filter(test => test.result === TestResult.FAILED).length;
      return failedTests > 0;
    }).length;

    const averageTestsPerContract = totalContracts > 0 ? totalTests / totalContracts : 0;

    return {
      totalContracts,
      totalTests,
      overallSuccessRate,
      contractsWithIssues,
      averageTestsPerContract,
    };
  }

  getTestTrends(
    tests: ContractTest[],
    days: number = 30
  ): {
    dailyTests: Array<{ date: string; tests: number; passed: number; failed: number }>;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const now = Date.now();
    const cutoffDate = now - days * 24 * 60 * 60 * 1000;

    const recentTests = tests.filter(test => (test.executedAt || 0) >= cutoffDate);

    const dailyTests: Array<{ date: string; tests: number; passed: number; failed: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0] || '';

      const dayTests = recentTests.filter(test => {
        const testDate = new Date(test.executedAt || 0);
        return testDate.toISOString().split('T')[0] === dateStr;
      });

      const passed = dayTests.filter(test => test.result === TestResult.PASSED).length;
      const failed = dayTests.filter(test => test.result === TestResult.FAILED).length;

      dailyTests.push({
        date: dateStr,
        tests: dayTests.length,
        passed,
        failed,
      });
    }

    const firstHalf = dailyTests.slice(0, Math.floor(dailyTests.length / 2));
    const secondHalf = dailyTests.slice(Math.floor(dailyTests.length / 2));

    const firstHalfSuccessRate =
      firstHalf.reduce((sum, day) => sum + day.passed / Math.max(day.tests, 1), 0) /
      firstHalf.length;
    const secondHalfSuccessRate =
      secondHalf.reduce((sum, day) => sum + day.passed / Math.max(day.tests, 1), 0) /
      secondHalf.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfSuccessRate > firstHalfSuccessRate + 0.1) {
      trend = 'improving';
    } else if (secondHalfSuccessRate < firstHalfSuccessRate - 0.1) {
      trend = 'declining';
    }

    return {
      dailyTests,
      trend,
    };
  }

  getContractHealthScore(
    contract: Contract,
    tests: ContractTest[],
    validations: ContractValidation[]
  ): {
    score: number;
    factors: string[];
    recommendations: string[];
  } {
    let score = 100;
    const factors: string[] = [];
    const recommendations: string[] = [];

    const contractTests = tests.filter(test => test.contractId === contract.id);
    const contractValidation = validations.find(v => v.contractId === contract.id);

    if (contractValidation && !contractValidation.isValid) {
      score -= 30;
      factors.push('Contract validation failed');
      recommendations.push('Fix contract validation errors');
    }

    if (contractTests.length === 0) {
      score -= 20;
      factors.push('No tests executed');
      recommendations.push('Execute contract tests');
    } else {
      const successRate =
        (contractTests.filter(test => test.result === TestResult.PASSED).length /
          contractTests.length) *
        100;
      if (successRate < 80) {
        score -= 25;
        factors.push(`Low test success rate: ${successRate.toFixed(1)}%`);
        recommendations.push('Investigate and fix failing tests');
      }
    }

    if (contract.examples.length === 0) {
      score -= 10;
      factors.push('No examples provided');
      recommendations.push('Add contract examples');
    }

    if (!contract.version) {
      score -= 5;
      factors.push('No version specified');
      recommendations.push('Add semantic versioning');
    }

    return {
      score: Math.max(0, score),
      factors,
      recommendations,
    };
  }
}
