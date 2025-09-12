FROM node:18-alpine AS base

# Устанавливаем pnpm
RUN npm install -g pnpm

WORKDIR /app

# Копируем файлы конфигурации
COPY package.json pnpm-lock.yaml* ./
COPY ../../shared/package.json ../../shared/
COPY ../../package.json ../../pnpm-workspace.yaml ../../

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY . .
COPY ../../shared ../../shared

# Собираем приложение
RUN pnpm build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base /app/public ./public

# Автоматически используем output traces для уменьшения размера образа
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
