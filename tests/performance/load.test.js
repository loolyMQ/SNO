const autocannon = require('autocannon');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

const API_BASE_URL = 'http://localhost:3001';

const testConfigs = [
  {
    name: 'Health Check Load Test',
    url: `${API_BASE_URL}/api/health`,
    connections: 10,
    duration: 10,
    expectedLatency: 100
  },
  {
    name: 'Search Load Test',
    url: `${API_BASE_URL}/api/search`,
    connections: 20,
    duration: 15,
    expectedLatency: 200,
    body: JSON.stringify({ q: 'machine learning' })
  },
  {
    name: 'Auth Load Test',
    url: `${API_BASE_URL}/api/auth/login`,
    connections: 5,
    duration: 10,
    expectedLatency: 150,
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  }
];

async function runLoadTest(config) {
  logger.info({
    test: config.name,
    action: 'start'
  }, `Running ${config.name}...`);
  
  const startTime = Date.now();
  
  const result = await autocannon({
    url: config.url,
    connections: config.connections,
    duration: config.duration,
    body: config.body,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  logger.info({
    test: config.name,
    requests: result.requests.total,
    duration: result.duration,
    throughput: result.throughput,
    avgLatency: result.latency.average,
    p95Latency: result.latency.p95,
    p99Latency: result.latency.p99,
    errors: result.errors,
    timeouts: result.timeouts,
    totalTime
  }, `Results for ${config.name}`);
  
  // Performance assertions
  const avgLatency = result.latency.average;
  const p95Latency = result.latency.p95;
  const errorRate = (result.errors / result.requests.total) * 100;
  
  if (avgLatency > config.expectedLatency) {
    logger.warn({
      test: config.name,
      avgLatency,
      expectedLatency: config.expectedLatency,
      issue: 'latency_exceeded'
    }, `Average latency ${avgLatency}ms exceeds expected ${config.expectedLatency}ms`);
  } else {
    logger.info({
      test: config.name,
      avgLatency,
      expectedLatency: config.expectedLatency
    }, `Average latency ${avgLatency}ms within expected ${config.expectedLatency}ms`);
  }
  
  if (p95Latency > config.expectedLatency * 2) {
    logger.warn({
      test: config.name,
      p95Latency,
      expectedLatency: config.expectedLatency * 2,
      issue: 'p95_latency_exceeded'
    }, `P95 latency ${p95Latency}ms exceeds expected ${config.expectedLatency * 2}ms`);
  } else {
    logger.info({
      test: config.name,
      p95Latency
    }, `P95 latency ${p95Latency}ms within expected range`);
  }
  
  if (errorRate > 1) {
    logger.warn({
      test: config.name,
      errorRate,
      threshold: 1,
      issue: 'error_rate_exceeded'
    }, `Error rate ${errorRate.toFixed(2)}% exceeds 1% threshold`);
  } else {
    logger.info({
      test: config.name,
      errorRate
    }, `Error rate ${errorRate.toFixed(2)}% within acceptable range`);
  }
  
  return {
    name: config.name,
    requests: result.requests.total,
    throughput: result.throughput,
    avgLatency: avgLatency,
    p95Latency: p95Latency,
    errorRate: errorRate,
    passed: avgLatency <= config.expectedLatency && errorRate <= 1
  };
}

async function runAllLoadTests() {
  logger.info({
    action: 'start_all_tests'
  }, 'Starting Science Map Platform Load Tests...');
  
  const results = [];
  
  for (const config of testConfigs) {
    try {
      const result = await runLoadTest(config);
      results.push(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error({
        test: config.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error.stack
      }, `Error running ${config.name}`);
      results.push({
        name: config.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  logger.info({
    passed,
    total,
    results: results.map(r => ({
      name: r.name,
      passed: r.passed,
      error: r.error
    }))
  }, `Load Test Summary: ${passed}/${total} tests passed`);
  
  results.forEach(result => {
    if (result.error) {
      logger.error({
        test: result.name,
        error: result.error
      }, `Test ${result.name} failed`);
    }
  });
  
  if (passed === total) {
    logger.info({
      passed,
      total
    }, 'All load tests passed!');
    process.exit(0);
  } else {
    logger.error({
      passed,
      total
    }, 'Some load tests failed!');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllLoadTests().catch(() => {});
}

module.exports = { runLoadTest, runAllLoadTests };
