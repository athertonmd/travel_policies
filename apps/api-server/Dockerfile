FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/api-server/ ./apps/api-server/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tpip/api-server build

EXPOSE 3001
CMD ["node", "apps/api-server/dist/index.js"]
