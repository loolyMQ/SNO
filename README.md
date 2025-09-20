# 🗺️ Карта науки (Science Map)

Интерактивная платформа для визуализации и анализа научных связей, построенная на микросервисной архитектуре с современным стеком технологий.

## 🚀 Особенности

### 🎯 Основной функционал
- **Интерактивная визуализация** научных работ и их связей
- **Продвинутый поиск** с фильтрацией по типу, дате, ключевым словам
- **Экспорт данных** в различных форматах (JSON, CSV, PNG, SVG, PDF)
- **Адаптивный дизайн** в стиле Obsidian
- **Высокая производительность** с оптимизацией D3.js и виртуализацией

### 🔐 Безопасность
- **JWT аутентификация** с refresh токенами
- **Ролевая авторизация** (user, researcher, admin)
- **Rate limiting** и валидация входных данных
- **Безопасные пароли** с проверкой сложности

### 🏗️ Архитектура
- **Микросервисы**: API Gateway, Graph Service, Search Service, Auth Service, Jobs Service
- **Event-driven** архитектура с Kafka
- **Масштабируемость** с горизонтальным автомасштабированием
- **Мониторинг** с Prometheus и Grafana

## 🛠️ Технологический стек

### Frontend
- **Next.js 14** - React фреймворк
- **TypeScript** - типизированный JavaScript
- **D3.js** - визуализация графов
- **Tailwind CSS** - стилизация
- **React Testing Library** - тестирование компонентов
- **Playwright** - E2E тестирование

### Backend
- **Node.js** - серверная платформа
- **Express.js** - веб-фреймворк
- **TypeScript** - типизированный JavaScript
- **Jest** - тестирование
- **Kafka** - очереди сообщений
- **Redis** - кэширование
- **PostgreSQL** - база данных

### DevOps & Infrastructure
- **Docker** - контейнеризация
- **Kubernetes** - оркестрация
- **Helm** - управление пакетами
- **GitHub Actions** - CI/CD
- **Prometheus** - мониторинг
- **Grafana** - дашборды

## 📁 Структура проекта

```
science-map/
├── frontend/                 # Next.js приложение
├── backend/                  # Микросервисы
│   ├── api-gateway/         # API Gateway
│   ├── graph-service/       # Сервис графов
│   ├── search-service/      # Сервис поиска
│   ├── auth-service/        # Сервис аутентификации
│   └── jobs-service/        # Сервис задач
├── infrastructure/          # Инфраструктура
│   ├── k8s/                # Kubernetes манифесты
│   ├── helm/               # Helm charts
│   └── monitoring/         # Мониторинг
├── shared/                 # Общие типы и утилиты
└── platform/              # Платформенные пакеты
```

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- pnpm
- Docker
- Kubernetes (для production)

### Установка

1. **Клонирование репозитория**
```bash
git clone https://github.com/loolyMQ/SNO.git
cd SNO
```

2. **Установка зависимостей**
```bash
pnpm install
```

3. **Запуск в режиме разработки**
```bash
# Запуск всех сервисов
pnpm dev

# Или отдельно
pnpm --filter frontend dev
pnpm --filter @science-map/api-gateway dev
```

4. **Запуск с Docker**
```bash
# Сборка образов
pnpm docker:build

# Запуск в development режиме
pnpm docker:dev

# Запуск в production режиме
pnpm docker:prod
```

### Переменные окружения

Создайте файлы `.env` в каждом сервисе:

```bash
# API Gateway
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
KAFKA_BROKER=localhost:9092

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
pnpm test

# С покрытием
pnpm test:coverage

# E2E тесты
pnpm --filter frontend test:e2e

# Конкретный сервис
pnpm --filter @science-map/api-gateway test
```

### Покрытие тестами
- **Unit тесты**: 80%+ покрытие
- **Integration тесты**: API endpoints
- **E2E тесты**: Playwright для frontend
- **Тесты безопасности**: JWT, авторизация

## 🚀 Деплой

### Staging
```bash
# Автоматический деплой через GitHub Actions
git push origin develop
```

### Production
```bash
# Автоматический деплой через GitHub Actions
git push origin main
```

### Ручной деплой
```bash
# Kubernetes
kubectl apply -f infrastructure/k8s/production/

# Helm
helm install science-map infrastructure/helm/science-map/
```

## 📊 Мониторинг

### Метрики
- **Prometheus**: сбор метрик
- **Grafana**: визуализация
- **Health checks**: проверка состояния сервисов

### Дашборды
- Микросервисы: производительность и ошибки
- Инфраструктура: ресурсы и сеть
- Бизнес-метрики: пользователи и использование

## 🔧 Разработка

### Добавление нового сервиса
1. Создайте папку в `backend/`
2. Добавьте `package.json` с зависимостями
3. Создайте Dockerfile
4. Добавьте в `turbo.json`
5. Настройте тесты

### Добавление нового компонента
1. Создайте компонент в `frontend/src/components/`
2. Добавьте тесты в `__tests__/`
3. Обновите типы в `types/`
4. Добавьте в экспорты

## 📈 Производительность

### Оптимизации
- **Виртуализация графов** для больших данных
- **LOD (Level of Detail)** рендеринг
- **WebGL** для сложных визуализаций
- **Кэширование** на всех уровнях
- **CDN** для статических ресурсов

### Масштабирование
- **Горизонтальное масштабирование** сервисов
- **Автомасштабирование** в Kubernetes
- **Load balancing** между инстансами
- **Database sharding** для больших объемов

## 🤝 Участие в разработке

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

### Стандарты кода
- **ESLint** + **Prettier** для форматирования
- **Conventional Commits** для сообщений
- **TypeScript** для типизации
- **Jest** для тестирования

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 👥 Команда

- **Архитектура**: Микросервисы, Kubernetes, CI/CD
- **Frontend**: Next.js, D3.js, TypeScript
- **Backend**: Node.js, Express, Kafka
- **DevOps**: Docker, Kubernetes, Helm
- **Тестирование**: Jest, Playwright, 80%+ покрытие

## 🔗 Полезные ссылки

- [Документация API](docs/api.md)
- [Руководство по развертыванию](docs/deployment.md)
- [Архитектурные принципы](docs/architecture.md)
- [Roadmap проекта](docs/roadmap.md)

---

**🎯 Проект готов к production deployment!**

Все основные функции реализованы, тесты написаны, CI/CD настроен, мониторинг готов. Система масштабируема, безопасна и готова к использованию.
