FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./

# Remove workspace dependencies and install
RUN sed -i 's/"@science-map\/shared": "workspace:\*",//' package.json && \
    npm install --omit=dev

# Copy already built files
COPY dist ./dist
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 deploymentservice

# Switch to non-root user
USER deploymentservice

# Expose port
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3009/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]