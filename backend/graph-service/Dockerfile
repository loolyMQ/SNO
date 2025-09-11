# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
RUN pnpm build

FROM node:20-alpine AS production
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
