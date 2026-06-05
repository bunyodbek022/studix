# Base image
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install pnpm and app dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy app source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN pnpm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

RUN npx prisma generate
# Create uploads directory with proper permissions
RUN mkdir -p uploads/videos && chown -R node:node uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start server and run migrations
CMD ["node", "dist/src/main"]
