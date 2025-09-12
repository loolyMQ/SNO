# Карта науки

Система визуализации научных связей с использованием микросервисной архитектуры.

## Архитектура

Проект состоит из следующих компонентов:

### Backend сервисы
- **API Gateway** (порт 3000) - единая точка входа для всех API запросов
- **Graph Service** (порт 3002) - управление данными графа и физикой
- **Search Service** (порт 3001) - поиск по научным данным
- **Auth Service** (порт 3004) - аутентификация пользователей
- **Jobs Service** (порт 3005) - фоновые задачи

### Frontend
- **Next.js приложение** (порт 3000) - веб-интерфейс с интерактивным графом

### Инфраструктура
- **Kafka** - межсервисное взаимодействие
- **Redis** - кэширование
- **Prometheus** - мониторинг метрик
- **Grafana** - визуализация метрик

## Быстрый старт

### 1. Установка зависимостей

```bash
# Установка pnpm (если не установлен)
npm install -g pnpm

# Установка зависимостей
pnpm install
```

### 2. Запуск инфраструктуры

```bash
# Запуск Kafka, Redis, Prometheus, Grafana
cd infrastructure
docker-compose up -d
```

### 3. Запуск backend сервисов

```bash
# Запуск всех backend сервисов
pnpm dev
```

### 4. Запуск frontend

```bash
# В отдельном терминале
cd frontend
pnpm dev
```

## Доступные сервисы

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3000/api
- **Kafka UI**: http://localhost:8080
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## API Endpoints

### Graph Service
- `GET /api/graph` - получение данных графа
- `POST /api/graph/update` - обновление данных графа
- `GET /api/graph/stats` - статистика графа
- `POST /api/graph/simulation/start` - запуск симуляции
- `POST /api/graph/simulation/stop` - остановка симуляции
- `POST /api/graph/physics/reset` - сброс физики

### Search Service
- `POST /api/search` - поиск по данным
- `GET /api/search/history` - история поиска

### Health Checks
- `GET /api/health` - проверка состояния сервиса

## Физика графа

Система использует алгоритм Fruchterman-Reingold для визуализации графа:

- **Отталкивание** - узлы отталкиваются друг от друга
- **Притяжение** - связанные узлы притягиваются
- **Гравитация** - узлы притягиваются к центру
- **Демпфирование** - замедление движения
- **Температура** - контролирует скорость движения (охлаждается со временем)

## Разработка

### Структура проекта

```
├── backend/           # Backend сервисы
│   ├── api-gateway/   # API Gateway
│   ├── graph-service/ # Graph Service
│   ├── search-service/# Search Service
│   ├── auth-service/  # Auth Service
│   └── jobs-service/  # Jobs Service
├── frontend/          # Next.js приложение
├── shared/            # Общие типы и утилиты
├── infrastructure/    # Docker Compose конфигурации
└── package.json       # Корневой package.json
```

### Добавление нового сервиса

1. Создайте папку в `backend/`
2. Добавьте `package.json` с зависимостями
3. Создайте `src/index.ts` с Express сервером
4. Добавьте сервис в `package.json` workspaces
5. Обновите `docker-compose.yml` при необходимости

### Мониторинг

- **Prometheus** собирает метрики с всех сервисов
- **Grafana** предоставляет дашборды для визуализации
- **Kafka UI** для мониторинга сообщений

## Troubleshooting

### Проблемы с портами
Если порты заняты, измените их в соответствующих файлах конфигурации.

### Проблемы с Kafka
```bash
# Проверка статуса Kafka
docker-compose logs kafka

# Перезапуск Kafka
docker-compose restart kafka
```

### Проблемы с зависимостями
```bash
# Очистка и переустановка
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Лицензия

MIT
