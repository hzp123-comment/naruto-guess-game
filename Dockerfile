# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ARG RESOURCE_VERSION=""

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV RESOURCE_VERSION=$RESOURCE_VERSION
WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY scripts scripts
COPY pow-wasm pow-wasm
COPY client client
COPY server server

RUN pnpm build \
 && pnpm --filter server deploy --prod --legacy /runtime/server

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    DB_CLIENT=sqlite \
    DB_URL=/tmp/naruto-guess.sqlite3 \
    PORT=3000 \
    REDIS_REQUIRED=false \
    POW_DIFFICULTY=17 \
    CORS_ORIGINS=*.onrender.com \
    TRUST_PROXY=true

WORKDIR /app

COPY --from=build --chown=node:node /runtime/server/node_modules ./server/node_modules
COPY --from=build --chown=node:node /workspace/server/dist ./server/dist
COPY --from=build --chown=node:node /workspace/client/dist ./client/dist

USER node
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
