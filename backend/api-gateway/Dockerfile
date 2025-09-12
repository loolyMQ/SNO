FROM node:18-alpine

WORKDIR /app

# Копируем package.json и pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./
COPY ../../shared/package.json ../../shared/
COPY ../../package.json ../../pnpm-workspace.yaml ../../

# Устанавливаем pnpm
RUN npm install -g pnpm

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY . .
COPY ../../shared ../../shared

# Собираем проект
RUN pnpm build

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["pnpm", "start"]
