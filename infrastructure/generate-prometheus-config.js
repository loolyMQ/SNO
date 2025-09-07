#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Конфигурация сервисов
const services = [
  'api-gateway',
  'auth-service', 
  'graph-service',
  'jobs-service',
  'search-service'
];

// Генерация конфигурации Prometheus
function generatePrometheusConfig() {
  const config = {
    global: {
      scrape_interval: '15s',
      evaluation_interval: '15s',
    },
    rule_files: [
      // 'rules/*.yml'
    ],
    scrape_configs: [
      // Prometheus сам себя
      {
        job_name: 'prometheus',
        static_configs: [
          { targets: ['localhost:9090'] }
        ]
      },
      
      // Микросервисы
      ...services.map(serviceName => ({
        job_name: serviceName,
        static_configs: [
          { targets: [`${serviceName}:909${services.indexOf(serviceName) + 1}`] }
        ],
        metrics_path: '/metrics',
        scrape_interval: '15s',
        scrape_timeout: '10s',
      })),
      
      // Инфраструктурные сервисы
      {
        job_name: 'postgres',
        static_configs: [
          { targets: ['postgres:5432'] }
        ]
      },
      {
        job_name: 'redis',
        static_configs: [
          { targets: ['redis:6379'] }
        ]
      },
      {
        job_name: 'rabbitmq',
        static_configs: [
          { targets: ['rabbitmq:15672'] }
        ],
        metrics_path: '/metrics'
      },
      {
        job_name: 'meilisearch',
        static_configs: [
          { targets: ['meilisearch:7700'] }
        ],
        metrics_path: '/metrics'
      }
    ]
  };

  return config;
}

// Генерация YAML конфигурации
function generateYamlConfig() {
  const config = generatePrometheusConfig();
  
  let yaml = `# Prometheus configuration for Science Map project
# Generated automatically on ${new Date().toISOString()}

global:
  scrape_interval: ${config.global.scrape_interval}
  evaluation_interval: ${config.global.evaluation_interval}

rule_files:
${config.rule_files.map(file => `  - ${file}`).join('\n')}

scrape_configs:
`;

  config.scrape_configs.forEach(job => {
    yaml += `  - job_name: '${job.job_name}'
    static_configs:
      - targets: ${JSON.stringify(job.static_configs[0].targets)}
`;
    
    if (job.metrics_path) {
      yaml += `    metrics_path: '${job.metrics_path}'
`;
    }
    
    if (job.scrape_interval) {
      yaml += `    scrape_interval: '${job.scrape_interval}'
`;
    }
    
    if (job.scrape_timeout) {
      yaml += `    scrape_timeout: '${job.scrape_timeout}'
`;
    }
    
    yaml += '\n';
  });

  return yaml;
}

// Основная функция
function main() {
  const configPath = path.join(__dirname, 'prometheus.yml');
  const yamlConfig = generateYamlConfig();
  
  try {
    fs.writeFileSync(configPath, yamlConfig, 'utf8');
    console.log('✅ Prometheus configuration generated successfully');
    console.log(`📁 File: ${configPath}`);
    console.log(`🔧 Services configured: ${services.join(', ')}`);
  } catch (error) {
    console.error('❌ Error generating Prometheus configuration:', error.message);
    process.exit(1);
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = {
  generatePrometheusConfig,
  generateYamlConfig,
  services
};
