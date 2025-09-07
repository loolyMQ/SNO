# Инфраструктура мониторинга "Карта науки"

## Обзор

Этот каталог содержит конфигурацию для мониторинга проекта "Карта науки" с использованием Prometheus и Grafana.

## Компоненты

### Prometheus
- **Порт:** 9090
- **Конфигурация:** `prometheus.yml`
- **Функции:**
  - Сбор метрик с микросервисов
  - Мониторинг инфраструктуры
  - Хранение временных рядов

### Grafana
- **Порт:** 3000
- **Логин:** admin
- **Пароль:** admin
- **Дашборды:**
  - Микросервисы - мониторинг HTTP запросов, времени отклика, метрик базы данных
  - Инфраструктура - мониторинг PostgreSQL, Redis, RabbitMQ, Meilisearch
  - Бизнес метрики - пользователи, поисковые запросы, конверсия

## Запуск

```bash
# Запуск всех сервисов мониторинга
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

## Доступ к сервисам

- **Grafana:** http://localhost:3000 (admin/admin)
- **Prometheus:** http://localhost:9090
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **RabbitMQ:** http://localhost:15672 (guest/guest)
- **Meilisearch:** http://localhost:7700

## Метрики

### HTTP метрики
- `http_requests_total` - общее количество HTTP запросов
- `http_request_duration_seconds` - время выполнения запросов
- `http_active_requests` - количество активных запросов

### База данных
- `database_queries_total` - общее количество запросов к БД
- `database_query_duration_seconds` - время выполнения запросов
- `database_connection_pool_size` - размер пула соединений

### Системные метрики
- `process_cpu_seconds_total` - использование CPU
- `process_resident_memory_bytes` - использование памяти
- `up` - статус сервиса (1 = работает, 0 = не работает)

## Настройка алертов

Алерты можно настроить в Prometheus или Grafana:

### Пример алерта в Prometheus
```yaml
groups:
  - name: science-map-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
```

## Разработка

### Добавление новых метрик

1. Используйте `@platform/monitoring` пакет в вашем сервисе
2. Создайте кастомные метрики через `MetricsCollector`
3. Добавьте метрики в дашборды Grafana

### Пример использования

```typescript
import { createMonitoring, createServiceMonitoringConfig } from '@platform/monitoring';

const config = createServiceMonitoringConfig('my-service');
const monitoring = createMonitoring(config);
await monitoring.initialize();

// Создание кастомной метрики
const customCounter = monitoring.createCounter('my_metric', 'Description of my metric');
customCounter.inc({ label: 'value' });
```

## Troubleshooting

### Проблемы с подключением
1. Проверьте, что все сервисы запущены: `docker-compose ps`
2. Проверьте логи: `docker-compose logs [service-name]`
3. Убедитесь, что порты не заняты: `lsof -i :3000`

### Проблемы с метриками
1. Проверьте endpoint метрик: `curl http://localhost:9091/metrics`
2. Убедитесь, что Prometheus видит сервис: http://localhost:9090/targets
3. Проверьте конфигурацию в `prometheus.yml`

### Проблемы с дашбордами
1. Перезапустите Grafana: `docker-compose restart grafana`
2. Проверьте права доступа к папке дашбордов
3. Убедитесь, что дашборды в правильном формате JSON