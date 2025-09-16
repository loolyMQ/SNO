# Infrastructure - Карта науки

Этот каталог содержит конфигурацию инфраструктуры для проекта "Карта науки".

## 🐳 Docker

### Файлы конфигурации

- `docker-compose.prod.yml` - Продакшен окружение
- `docker-compose.dev.yml` - Разработческое окружение
- `prometheus.yml` - Конфигурация мониторинга

### Сервисы

#### Инфраструктурные сервисы
- **Zookeeper** (порт 2181) - Координация Kafka
- **Kafka** (порт 9092) - Очереди сообщений
- **Redis** (порт 6379) - Кэширование
- **Prometheus** (порт 9090) - Метрики
- **Grafana** (порт 3001) - Дашборды

#### Приложение
- **API Gateway** (порт 3000) - Единая точка входа
- **Graph Service** (порт 3002) - Управление графом
- **Search Service** (порт 3003) - Поиск
- **Auth Service** (порт 3004) - Аутентификация
- **Jobs Service** (порт 3005) - Фоновые задачи
- **Frontend** (порт 3006) - Пользовательский интерфейс

## 🚀 Запуск

### Разработка
```bash
# Запуск только инфраструктуры
pnpm run docker:dev

# Или напрямую
docker-compose -f infrastructure/docker-compose.dev.yml up -d
```

### Продакшен
```bash
# Сборка и деплой
pnpm run docker:build
pnpm run docker:deploy

# Или пошагово
docker-compose -f infrastructure/docker-compose.prod.yml up --build -d
```

### Остановка
```bash
pnpm run docker:stop
```

## 📊 Мониторинг

### Grafana
- URL: http://localhost:3001
- Логин: admin
- Пароль: admin

### Prometheus
- URL: http://localhost:9090

### Дашборды
- `microservices-dashboard.json` - Основной дашборд микросервисов

## 🔧 Полезные команды

```bash
# Просмотр логов
pnpm run docker:logs

# Просмотр логов конкретного сервиса
docker-compose -f infrastructure/docker-compose.prod.yml logs -f api-gateway

# Перезапуск сервиса
docker-compose -f infrastructure/docker-compose.prod.yml restart api-gateway

# Масштабирование сервиса
docker-compose -f infrastructure/docker-compose.prod.yml up -d --scale graph-service=3

# Очистка неиспользуемых образов
docker system prune -a
```

## 📁 Структура

```
infrastructure/
├── docker-compose.prod.yml    # Продакшен конфигурация
├── docker-compose.dev.yml     # Разработка конфигурация
├── prometheus.yml             # Конфигурация Prometheus
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml
│   │   └── dashboards/
│   │       └── dashboard.yml
│   └── dashboards/
│       └── microservices-dashboard.json
└── README.md
```

## 🔒 Безопасность

- Все сервисы запускаются от непривилегированного пользователя
- Используются health checks для проверки состояния
- Настроены security headers через Helmet
- CORS настроен для продакшена

## 📈 Масштабирование

Для горизонтального масштабирования:

```bash
# Масштабирование Graph Service
docker-compose -f infrastructure/docker-compose.prod.yml up -d --scale graph-service=3

# Масштабирование Search Service
docker-compose -f infrastructure/docker-compose.prod.yml up -d --scale search-service=2
```

## 🐛 Отладка

### Проверка состояния сервисов
```bash
docker-compose -f infrastructure/docker-compose.prod.yml ps
```

### Просмотр ресурсов
```bash
docker stats
```

### Подключение к контейнеру
```bash
docker-compose -f infrastructure/docker-compose.prod.yml exec api-gateway sh
```
