# Platform - Общие технологии

Эта папка содержит общие технологии и компоненты для проекта "Карта науки".

## Структура

```
platform/
├── configs/          # Общие конфигурации
│   ├── tsconfig.base.json
│   ├── eslint.json
│   ├── prettier.json
│   ├── jest.json
│   └── jest.setup.ts
├── monitoring/       # Система мониторинга
│   ├── src/
│   │   ├── metrics/     # Prometheus метрики
│   │   ├── tracing/     # OpenTelemetry трейсинг
│   │   ├── health/      # Health checks
│   │   └── middleware/  # Express middleware
├── logging/         # Система логирования
│   ├── src/
│   │   ├── logger.ts    # Pino логгер
│   │   └── types.ts     # Типы для логирования
├── types/           # Общие TypeScript типы
│   └── src/
│       └── index.ts     # API, Graph, User, Search типы
└── utils/           # Общие утилиты
    └── src/
        ├── validation.ts
        ├── crypto.ts
        ├── date.ts
        ├── string.ts
        ├── array.ts
        └── object.ts
```

## Использование

### Конфигурации

```typescript
// tsconfig.json
{
  "extends": "@platform/configs/tsconfig.base.json"
}

// .eslintrc.json
{
  "extends": "@platform/configs/eslint.json"
}

// .prettierrc
{
  "extends": "@platform/configs/prettier.json"
}
```

### Мониторинг

```typescript
import { initializeTracing, createMetricsServer } from '@platform/monitoring';

// Инициализация трейсинга
const sdk = initializeTracing({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'development',
});

// Запуск метрик сервера
createMetricsServer(9091);
```

### Логирование

```typescript
import { createLogger, createHttpLoggingMiddleware } from '@platform/logging';

const logger = createLogger({ service: 'my-service' });
const httpMiddleware = createHttpLoggingMiddleware(logger);
```

### Утилиты

```typescript
import { isValidEmail, generateId, formatDate } from '@platform/utils';

const email = 'test@example.com';
const isValid = isValidEmail(email);
const id = generateId();
const date = formatDate(new Date());
```

### Типы

```typescript
import { ApiResponse, GraphNode, User } from '@platform/types';

const response: ApiResponse<User> = {
  success: true,
  data: user,
  timestamp: Date.now(),
};
```

## Сборка

```bash
# Сборка всех platform пакетов
pnpm build

# Сборка конкретного пакета
cd platform/monitoring && pnpm build
```

## Тестирование

```bash
# Запуск всех тестов
pnpm test

# Запуск тестов конкретного пакета
cd platform/utils && pnpm test
```
