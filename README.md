#  Карта науки - Монорепо

> **Проект:** Интерактивная карта институтов и их кафедр для СНО. 
> **Архитектура:** Микросервисы + Next.js фронтенд  
> **Менеджер пакетов:** pnpm  
> **Система сборки:** Turborepo  

##  Быстрый старт

### Установка зависимостей
```bash
# Установка pnpm (если не установлен)
npm install -g pnpm

# Установка всех зависимостей
pnpm install
```

### Запуск в режиме разработки
```bash
# Запуск всех сервисов
pnpm dev

# Или запуск конкретного сервиса
pnpm dev:frontend
pnpm dev:backend
```

## 📁 Структура проекта

```
Карта науки/
├──  frontend/                 # Next.js приложение (пользовательский интерфейс)
│   ├── src/
│   │   ├── app/                # App Router (Next.js 13+)
│   │   ├── components/         # React компоненты
│   │   ├── lib/               # Утилиты и конфигурация
│   │   └── styles/            # CSS/SCSS стили
│   ├── package.json
│   └── tsconfig.json
│
├──  backend/                 # Микросервисы
│   ├── api-gateway/           # API Gateway (NestJS + GraphQL)
│   │   ├── src/
│   │   │   ├── modules/       # GraphQL модули
│   │   │   ├── resolvers/     # GraphQL резолверы
│   │   │   └── main.ts        # Точка входа
│   │   └── Dockerfile
│   │
│   ├── auth-service/          # Сервис аутентификации
│   │   ├── src/
│   │   │   ├── auth/          # JWT, OAuth, сессии
│   │   │   ├── users/         # Управление пользователями
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   ├── graph-service/         # Сервис графа науки
│   │   ├── src/
│   │   │   ├── graph/         # Neo4j/Cypher запросы
│   │   │   ├── nodes/         # Узлы графа (науки, направления)
│   │   │   ├── edges/         # Связи между узлами
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   ├── jobs-service/          # Сервис фоновых задач
│   │   ├── src/
│   │   │   ├── jobs/          # BullMQ очереди
│   │   │   ├── workers/       # Обработчики задач
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   └── search-service/        # Сервис поиска
│       ├── src/
│       │   ├── search/        # Meilisearch интеграция
│       │   ├── indexing/      # Индексация данных
│       │   └── main.ts
│       └── Dockerfile
│
├──  platform/               # Общие пакеты и утилиты
│   ├── shared/                # Общие утилиты
│   │   ├── types/             # TypeScript типы
│   │   ├── utils/             # Утилиты
│   │   └── constants/         # Константы
│   │
│   ├── ui/                    # UI компоненты
│   │   ├── components/        # Переиспользуемые компоненты
│   │   ├── hooks/             # React хуки
│   │   └── themes/            # MUI темы
│   │
│   ├── graph/                 # GraphQL схемы и типы
│   │   ├── schemas/           # GraphQL схемы
│   │   ├── types/             # Сгенерированные типы
│   │   └── fragments/         # GraphQL фрагменты
│   │
│   ├── lists/                 # Списки и конфигурации
│   │   ├── scientific-fields/ # Научные направления
│   │   ├── universities/      # Университеты
│   │   └── researchers/       # Исследователи
│   │
│   ├── clients/               # API клиенты
│   │   ├── graphql/           # GraphQL клиент
│   │   ├── rest/              # REST клиенты
│   │   └── websocket/         # WebSocket клиенты
│   │
│   └── configs/               # Конфигурации
│       ├── eslint.json        # ESLint конфиг
│       ├── prettier.json      # Prettier конфиг
│       ├── tsconfig.json      # TypeScript конфиг
│       └── jest.json          # Jest конфиг
│
├──  infrastructure/         # Инфраструктура и DevOps
│   ├── docker-compose.yml     # Docker Compose для разработки
│   ├── kubernetes/            # K8s манифесты
│   ├── terraform/             # Terraform конфигурации
│   └── scripts/               # Скрипты развертывания
│
├──  .github/                # GitHub Actions
│   └── workflows/
│       └── ci.yml             # CI/CD пайплайн
│
├──  package.json            # Корневой package.json
├──  pnpm-workspace.yaml     # pnpm workspace конфиг
├──  turbo.json              # Turborepo конфиг
└──  .gitignore              # Git ignore правила
```

##  Технологический стек

### Frontend
- **Next.js 14** (App Router) - React фреймворк
- **TypeScript** - типизация
- **MUI** - UI компоненты
- **visx-D3** - визуализация графов
- **next-intl** - интернационализация
- **React Hook Form** - формы

### Backend
- **NestJS** - Node.js фреймворк
- **GraphQL** + **Apollo Server** - API
- **PostgreSQL** + **Prisma** - база данных
- **Neo4j** - графовая база данных
- **Meilisearch** - поиск
- **BullMQ** + **RabbitMQ** - очереди задач

### DevOps
- **Docker** + **Docker Compose** - контейнеризация
- **Kubernetes** - оркестрация
- **GitHub Actions** - CI/CD
- **Terraform** - инфраструктура


##  Полезные команды

### Установка и запуск
```bash
# Установка зависимостей
pnpm install

# Запуск всех сервисов
pnpm dev

# Запуск конкретного сервиса
pnpm dev:frontend
pnpm dev:api-gateway
pnpm dev:auth-service
```

### Сборка и тестирование
```bash
# Сборка всех пакетов
pnpm build

# Запуск тестов
pnpm test

# Линтинг
pnpm lint

# Форматирование кода
pnpm format
```

### Docker
```bash
# Запуск всех сервисов в Docker
docker-compose up -d

# Остановка всех сервисов
docker-compose down

# Пересборка образов
docker-compose build --no-cache
```

---

**Удачной разработки!**
