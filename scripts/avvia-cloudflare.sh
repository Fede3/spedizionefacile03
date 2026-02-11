#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_LOG="/tmp/cloudflared-backend.log"
FRONTEND_LOG="/tmp/cloudflared-frontend.log"

NUXT_PORT="${NUXT_PORT:-3001}"
LARAVEL_PORT="${LARAVEL_PORT:-8000}"

wait_for_tunnel_url() {
  local logfile="$1"
  local retries=40
  local url=""

  while [[ $retries -gt 0 ]]; do
    if [[ -f "$logfile" ]]; then
      url="$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$logfile" | head -n 1 || true)"
      if [[ -n "$url" ]]; then
        echo "$url"
        return 0
      fi
    fi
    retries=$((retries - 1))
    sleep 1
  done

  return 1
}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared non trovato. Installa cloudflared nel container e riesegui questo script."
  exit 1
fi

pkill -f "cloudflared tunnel --url http://127.0.0.1:${LARAVEL_PORT}" >/dev/null 2>&1 || true
pkill -f "cloudflared tunnel --url http://127.0.0.1:${NUXT_PORT}" >/dev/null 2>&1 || true

# 1) Prepara dipendenze e avvia solo Laravel
export NUXT_PORT LARAVEL_PORT
SKIP_NUXT_START=1 bash "${ROOT_DIR}/scripts/avvia-tutto.sh"

# 2) Espone backend con Cloudflare Tunnel
cloudflared tunnel --url "http://127.0.0.1:${LARAVEL_PORT}" --no-autoupdate > "$BACKEND_LOG" 2>&1 &
BACKEND_PUBLIC_URL="$(wait_for_tunnel_url "$BACKEND_LOG")"

if [[ -z "$BACKEND_PUBLIC_URL" ]]; then
  echo "Impossibile ottenere URL tunnel backend. Controlla $BACKEND_LOG"
  exit 1
fi

# 3) Riavvia Nuxt con API base pubblica del backend
pkill -f "nuxt.*--port ${NUXT_PORT}" >/dev/null 2>&1 || true
pkill -f "nuxi dev --host 0.0.0.0 --port ${NUXT_PORT}" >/dev/null 2>&1 || true

NUXT_PUBLIC_API_BASE="$BACKEND_PUBLIC_URL" APP_FRONTEND_URL_OVERRIDE="${APP_FRONTEND_URL_OVERRIDE:-}" SKIP_LARAVEL_START=1 bash "${ROOT_DIR}/scripts/avvia-tutto.sh"

# 4) Espone frontend con Cloudflare Tunnel
cloudflared tunnel --url "http://127.0.0.1:${NUXT_PORT}" --no-autoupdate > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PUBLIC_URL="$(wait_for_tunnel_url "$FRONTEND_LOG")"

if [[ -z "$FRONTEND_PUBLIC_URL" ]]; then
  echo "Impossibile ottenere URL tunnel frontend. Controlla $FRONTEND_LOG"
  exit 1
fi

echo ""
echo "Frontend pubblico: $FRONTEND_PUBLIC_URL"
echo "Backend pubblico:  $BACKEND_PUBLIC_URL"
echo ""
echo "Apri il frontend Cloudflare sopra per usare il sito da qualsiasi dispositivo."
