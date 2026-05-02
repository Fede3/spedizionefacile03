# =============================================================================
# Dockerfile — Nuxt 4 SPA (Vue 3.5 + Pinia + Tailwind 4 + Nuxt UI 4)
# =============================================================================
# Profili supportati:
#   - target=dev      : nuxi dev su :3001 con HMR + bind mount
#   - target=builder  : produce .output/ tramite `nuxi build`
#   - target=runtime  : SSR runtime con Node + .output/server/index.mjs
#
# Uso da docker-compose.yml:
#   build:
#     context: ./apps/web
#     target: dev
# =============================================================================

# ---- BASE -------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# Pacchetti minimi per build native (sharp, leaflet pixmatch...)
RUN apk add --no-cache libc6-compat python3 make g++ \
 && rm -rf /var/cache/apk/*

# ---- DEPS -------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline

# ---- DEV --------------------------------------------------------------------
# Profilo bind-mount-friendly: il codice viene montato a runtime,
# qui pre-installiamo node_modules e prepariamo nuxt.
FROM deps AS dev
COPY . .
RUN node ./node_modules/@nuxt/cli/bin/nuxi.mjs prepare

ENV HOST=0.0.0.0 \
    PORT=3001 \
    NUXT_PUBLIC_API_BASE=http://laravel:8000

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://localhost:${PORT}/" || exit 1

CMD ["npm", "run", "dev"]

# ---- BUILDER ----------------------------------------------------------------
FROM deps AS builder
COPY . .
RUN node --max-old-space-size=6144 ./node_modules/@nuxt/cli/bin/nuxi.mjs build

# ---- RUNTIME (SSR production) -----------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/.output ./.output
ENV HOST=0.0.0.0 \
    PORT=3001 \
    NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://localhost:${PORT}/" || exit 1
CMD ["node", ".output/server/index.mjs"]
