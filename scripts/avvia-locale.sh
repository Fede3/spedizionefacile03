#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Per uso locale con Caddy come origine unica (8787)
export NUXT_PUBLIC_API_BASE="${NUXT_PUBLIC_API_BASE:-http://127.0.0.1:8787}"
export APP_FRONTEND_URL_OVERRIDE="${APP_FRONTEND_URL_OVERRIDE:-http://127.0.0.1:8787}"
export NUXT_PORT="${NUXT_PORT:-3001}"
export LARAVEL_PORT="${LARAVEL_PORT:-8000}"

if [[ -z "${WSL_HOST_GATEWAY:-}" ]]; then
  WSL_HOST_GATEWAY="$(ip route 2>/dev/null | awk '/default/ {print $3; exit}')"
  if [[ -n "${WSL_HOST_GATEWAY:-}" ]]; then
    export WSL_HOST_GATEWAY
  fi
fi

resolve_proxy_target() {
  local port="$1"
  shift

  for host in "$@"; do
    [[ -z "$host" ]] && continue
    local status=""
    status="$(curl -sS -o /dev/null --max-time 2 -w '%{http_code}' "http://${host}:${port}/" || true)"
    if [[ -n "$status" && "$status" != "000" ]]; then
      echo "${host}:${port}"
      return 0
    fi
  done

  echo "127.0.0.1:${port}"
}

proxy_hosts=()
if [[ -n "${WSL_HOST_GATEWAY:-}" ]]; then
  proxy_hosts+=("${WSL_HOST_GATEWAY}")
fi
proxy_hosts+=(localhost 127.0.0.1)

for host in $(hostname -I 2>/dev/null || true); do
  if [[ -n "$host" && "$host" != "127.0.0.1" && "$host" != "0.0.0.0" ]]; then
    proxy_hosts+=("$host")
  fi
done

export SF_FRONTEND_PROXY_TARGET="${SF_FRONTEND_PROXY_TARGET:-$(resolve_proxy_target "$NUXT_PORT" "${proxy_hosts[@]}")}"
export SF_BACKEND_PROXY_TARGET="${SF_BACKEND_PROXY_TARGET:-$(resolve_proxy_target "$LARAVEL_PORT" "${proxy_hosts[@]}")}"

bash "${ROOT_DIR}/scripts/avvia-tutto.sh"

if command -v caddy >/dev/null 2>&1; then
  if [[ -n "${CADDYFILE_OVERRIDE:-}" && -f "${CADDYFILE_OVERRIDE}" ]]; then
    CADDYFILE_PATH="${CADDYFILE_OVERRIDE}"
  else
    CADDYFILE_PATH="${ROOT_DIR}/Caddyfile"
    if [[ ! -f "$CADDYFILE_PATH" ]]; then
      CADDYFILE_PATH="${ROOT_DIR}/Caddyfile.example"
    fi
  fi

  pkill -f "caddy run" >/dev/null 2>&1 || true
  (cd "$ROOT_DIR" && caddy run --config "$CADDYFILE_PATH" > /tmp/caddy.log 2>&1 &)
  sleep 2

  echo "Frontend/SPA (via Caddy): http://127.0.0.1:8787"
  echo "API Laravel (via Caddy): http://127.0.0.1:8787/api"
  echo "Proxy frontend Caddy -> ${SF_FRONTEND_PROXY_TARGET}"
  echo "Proxy backend Caddy -> ${SF_BACKEND_PROXY_TARGET}"
  echo "Log Caddy: /tmp/caddy.log"
else
  echo "Caddy non installato. App avviata su:"
  echo "   - Nuxt: http://127.0.0.1:${NUXT_PORT}"
  echo "   - Laravel: http://127.0.0.1:${LARAVEL_PORT}"
  echo "   Installa Caddy e riesegui per avere origine unica su :8787."
fi
