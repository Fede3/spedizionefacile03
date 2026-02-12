#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Per uso locale con Caddy come origine unica (8787)
export NUXT_PUBLIC_API_BASE="${NUXT_PUBLIC_API_BASE:-http://127.0.0.1:8787}"
export APP_FRONTEND_URL_OVERRIDE="${APP_FRONTEND_URL_OVERRIDE:-http://127.0.0.1:8787}"
export NUXT_PORT="${NUXT_PORT:-3001}"
export LARAVEL_PORT="${LARAVEL_PORT:-8000}"

bash "${ROOT_DIR}/scripts/avvia-tutto.sh"

if command -v caddy >/dev/null 2>&1; then
  CADDYFILE_PATH="${ROOT_DIR}/Caddyfile"
  if [[ ! -f "$CADDYFILE_PATH" ]]; then
    CADDYFILE_PATH="${ROOT_DIR}/Caddyfile.example"
  fi

  pkill -f "caddy run" >/dev/null 2>&1 || true
  (cd "$ROOT_DIR" && caddy run --config "$CADDYFILE_PATH" > /tmp/caddy.log 2>&1 &)
  sleep 2

  echo "Frontend/SPA (via Caddy): http://127.0.0.1:8787"
  echo "API Laravel (via Caddy): http://127.0.0.1:8787/api"
  echo "Log Caddy: /tmp/caddy.log"
else
  echo "Caddy non installato. App avviata su:"
  echo "   - Nuxt: http://127.0.0.1:${NUXT_PORT}"
  echo "   - Laravel: http://127.0.0.1:${LARAVEL_PORT}"
  echo "   Installa Caddy e riesegui per avere origine unica su :8787."
fi
