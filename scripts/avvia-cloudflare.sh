#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL_ONLINE_FILE="${ROOT_DIR}/URL_ONLINE.txt"
BACKEND_LOG="/tmp/cloudflared-backend.log"
FRONTEND_LOG="/tmp/cloudflared-frontend.log"

NUXT_PORT="${NUXT_PORT:-3001}"
LARAVEL_PORT="${LARAVEL_PORT:-8000}"
FRONTEND_PROXY_PORT="${FRONTEND_PROXY_PORT:-8787}"
EXPOSE_BACKEND_TUNNEL="${EXPOSE_BACKEND_TUNNEL:-0}"

test_tcp_endpoint() {
  local host="$1"
  local port="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z -w 1 "$host" "$port" >/dev/null 2>&1
    return $?
  fi

  (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1
}

resolve_proxy_target() {
  local port="$1"
  shift
  local host=""

  for host in "$@"; do
    [[ -z "$host" ]] && continue
    if test_tcp_endpoint "$host" "$port"; then
      printf 'http://%s:%s\n' "$host" "$port"
      return 0
    fi
  done

  printf 'http://127.0.0.1:%s\n' "$port"
}

wait_for_tunnel_url() {
  local logfile="$1"
  local retries=40
  local url=""

  while [[ $retries -gt 0 ]]; do
    if [[ -f "$logfile" ]]; then
      url="$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" "$logfile" | tail -n 1 || true)"
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

preview_is_healthy() {
  local base_url="$1"
  local normalized_url="${base_url%/}"
  local paths=(
    "$normalized_url"
    "$normalized_url/api/public/price-bands"
  )

  for path in "${paths[@]}"; do
    local status=""
    status="$(curl -sS -o /dev/null -I -w '%{http_code}' --max-time 10 "$path" || true)"
    if [[ -z "$status" || "$status" == "000" || "$status" == "530" || "$status" -ge 500 ]]; then
      return 1
    fi
  done

  return 0
}

wait_for_pid_alive() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

wait_for_tunnel_reachable() {
  local url="$1"
  local retries=45

  while [[ $retries -gt 0 ]]; do
    if preview_is_healthy "$url"; then
      return 0
    fi

    retries=$((retries - 1))
    sleep 2
  done

  return 1
}

print_tunnel_error() {
  local label="$1"
  local logfile="$2"

  if [[ -f "$logfile" ]] && grep -Eq "1015|429 Too Many Requests" "$logfile"; then
    echo "Tunnel ${label} non creato: Cloudflare Quick Tunnel e' in rate limit (1015/429). Attendi il cooldown oppure usa un named tunnel."
    echo "Log: $logfile"
    return 0
  fi

  if [[ -f "$logfile" ]] && grep -Eq "530|1033" "$logfile"; then
    echo "Tunnel ${label} creato ma non propagato o non raggiungibile (530/1033). Controlla il backend locale e riprova."
    echo "Log: $logfile"
    return 0
  fi

  echo "Tunnel ${label} non disponibile. Controlla $logfile"
}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared non trovato. Installa cloudflared nel container e riesegui questo script."
  exit 1
fi

pkill -f "cloudflared tunnel" >/dev/null 2>&1 || true
sleep 1
rm -f "$BACKEND_LOG" "$FRONTEND_LOG"

# 1) Rialza locale in modalita' corretta: Nuxt (3001) + Laravel (8000) + Caddy (8787)
CADDYFILE_OVERRIDE="${ROOT_DIR}/Caddyfile.trycloudflare" bash "${ROOT_DIR}/scripts/avvia-locale.sh"

HOST_CANDIDATES=()
if [[ -n "${WSL_HOST_GATEWAY:-}" ]]; then
  HOST_CANDIDATES+=("${WSL_HOST_GATEWAY}")
fi
if command -v ip >/dev/null 2>&1; then
  DEFAULT_GATEWAY="$(ip route show default 2>/dev/null | awk '/default/ { print $3; exit }')"
  if [[ -n "${DEFAULT_GATEWAY}" ]]; then
    HOST_CANDIDATES+=("${DEFAULT_GATEWAY}")
  fi
fi
HOST_CANDIDATES+=("localhost" "127.0.0.1")

FRONTEND_TUNNEL_TARGET="$(resolve_proxy_target "${FRONTEND_PROXY_PORT}" "${HOST_CANDIDATES[@]}")"
BACKEND_TUNNEL_TARGET="$(resolve_proxy_target "${LARAVEL_PORT}" "${HOST_CANDIDATES[@]}")"

# 2) Espone la superficie pubblica tramite Caddy (origine unica frontend + API).
# Per la preview basta questo tunnel: il backend dedicato aumenta il rate-limit
# dei quick tunnel e non aggiunge valore al flusso utente.
cloudflared tunnel --url "${FRONTEND_TUNNEL_TARGET}" --no-autoupdate --logfile "$FRONTEND_LOG" >/dev/null 2>&1 &
FRONTEND_PID=$!
FRONTEND_PUBLIC_URL="$(wait_for_tunnel_url "$FRONTEND_LOG")"

if [[ -z "$FRONTEND_PUBLIC_URL" ]]; then
  print_tunnel_error "frontend" "$FRONTEND_LOG"
  exit 1
fi

if ! wait_for_pid_alive "$FRONTEND_PID"; then
  print_tunnel_error "frontend" "$FRONTEND_LOG"
  exit 1
fi

if ! wait_for_tunnel_reachable "$FRONTEND_PUBLIC_URL"; then
  echo "Tunnel frontend creato ma non ancora raggiungibile o non propagato correttamente. Controlla $FRONTEND_LOG"
  exit 1
fi

printf '%s\n' "$FRONTEND_PUBLIC_URL" > "$URL_ONLINE_FILE"

BACKEND_PUBLIC_URL=""
if [[ "$EXPOSE_BACKEND_TUNNEL" == "1" ]]; then
  cloudflared tunnel --url "${BACKEND_TUNNEL_TARGET}" --no-autoupdate --logfile "$BACKEND_LOG" >/dev/null 2>&1 &
  BACKEND_PID=$!
  BACKEND_PUBLIC_URL="$(wait_for_tunnel_url "$BACKEND_LOG" || true)"
  if [[ -n "$BACKEND_PUBLIC_URL" ]] && wait_for_pid_alive "$BACKEND_PID" && wait_for_tunnel_reachable "$BACKEND_PUBLIC_URL"; then
    echo "Backend pubblico opzionale: $BACKEND_PUBLIC_URL"
  else
    echo "Backend pubblico opzionale non certificato. La preview principale resta: $FRONTEND_PUBLIC_URL"
  fi
fi

echo ""
echo "Frontend pubblico (origine unica via Caddy): $FRONTEND_PUBLIC_URL"
echo "Origin tunnel frontend: $FRONTEND_TUNNEL_TARGET"
if [[ -n "$BACKEND_PUBLIC_URL" ]]; then
  echo "Backend pubblico opzionale: $BACKEND_PUBLIC_URL"
  echo "Origin tunnel backend: $BACKEND_TUNNEL_TARGET"
fi
echo "URL_ONLINE aggiornato: $URL_ONLINE_FILE"
echo ""
echo "Apri il frontend Cloudflare sopra per usare il sito da qualsiasi dispositivo."
