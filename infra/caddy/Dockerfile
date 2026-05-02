# =============================================================================
# Dockerfile — Caddy 2 reverse proxy locale (split Laravel + Nuxt)
# =============================================================================
# Routing identico a infra/caddy/Caddyfile:
#   /api/*  /sanctum/*  /storage/*  /auth/*  /webhooks/*  /stripe/*  -> laravel:8000
#   tutto il resto                                                    -> nuxt:3001
#
# Le env vars SF_BACKEND_PROXY_TARGET / SF_FRONTEND_PROXY_TARGET sono usate
# dal Caddyfile per puntare ai service name docker-compose.
# =============================================================================

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

ENV SF_BACKEND_PROXY_TARGET=laravel:8000 \
    SF_FRONTEND_PROXY_TARGET=nuxt:3001

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://localhost:8787/" || exit 1
