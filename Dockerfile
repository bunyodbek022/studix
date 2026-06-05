FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN pnpm run build


FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

RUN npx prisma generate

RUN mkdir -p uploads/videos && chown -R node:node uploads

USER node

EXPOSE 3000

CMD ["node", "dist/src/main"]