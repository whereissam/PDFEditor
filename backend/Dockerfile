# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3120

# Copy application files
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules

# Create storage directory
RUN mkdir -p /app/storage

EXPOSE 3120

CMD ["bun", "run", "src/index.ts"]
