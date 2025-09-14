export const prometheusConfig = {
  global: {
    scrape_interval: '15s',
    evaluation_interval: '15s',
  },
  rule_files: [],
  scrape_configs: [
    {
      job_name: 'science-map-api-gateway',
      static_configs: [
        {
          targets: ['localhost:9091'],
        },
      ],
      metrics_path: '/metrics',
      scrape_interval: '5s',
    },
    {
      job_name: 'science-map-graph-service',
      static_configs: [
        {
          targets: ['localhost:9092'],
        },
      ],
      metrics_path: '/metrics',
      scrape_interval: '5s',
    },
    {
      job_name: 'science-map-search-service',
      static_configs: [
        {
          targets: ['localhost:9093'],
        },
      ],
      metrics_path: '/metrics',
      scrape_interval: '5s',
    },
    {
      job_name: 'science-map-jobs-service',
      static_configs: [
        {
          targets: ['localhost:9094'],
        },
      ],
      metrics_path: '/metrics',
      scrape_interval: '5s',
    },
    {
      job_name: 'science-map-auth-service',
      static_configs: [
        {
          targets: ['localhost:9095'],
        },
      ],
      metrics_path: '/metrics',
      scrape_interval: '5s',
    },
  ],
};
