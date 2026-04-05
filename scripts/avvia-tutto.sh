#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_project_dir() {
  local preferred="$1"
  local marker="$2"
  if [[ -f "${ROOT_DIR}/${preferred}/${marker}" ]]; then
    echo "${ROOT_DIR}/${preferred}"
    return 0
  fi

  local found
  found="$(find "${ROOT_DIR}" -mindepth 1 -maxdepth 2 -type f -name "${marker}" | head -n 1 || true)"
  if [[ -n "$found" ]]; then
    dirname "$found"
    return 0
  fi

  echo ""
}

LARAVEL_DIR="$(resolve_project_dir "laravel-spedizionefacile-main" "artisan")"
NUXT_DIR="$(resolve_project_dir "nuxt-spedizionefacile-master" "nuxt.config.ts")"

if [[ -z "$LARAVEL_DIR" ]]; then
  echo "Cartella Laravel non trovata (marker artisan)."
  exit 1
fi

if [[ -z "$NUXT_DIR" ]]; then
  echo "Cartella Nuxt non trovata (marker nuxt.config.ts)."
  exit 1
fi

NUXT_PORT="${NUXT_PORT:-3001}"
LARAVEL_PORT="${LARAVEL_PORT:-8000}"

if [[ -z "${NUXT_PUBLIC_API_BASE:-}" ]]; then
  if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
    export NUXT_PUBLIC_API_BASE="https://${CODESPACE_NAME}-${LARAVEL_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  else
    export NUXT_PUBLIC_API_BASE="http://127.0.0.1:${LARAVEL_PORT}"
  fi
fi

if ! command -v composer >/dev/null 2>&1; then
  echo "Composer non disponibile nel container."
  exit 1
fi

if [[ -f "${LARAVEL_DIR}/composer.json" ]]; then
  if [[ ! -f "${LARAVEL_DIR}/vendor/autoload.php" ]]; then
    (cd "${LARAVEL_DIR}" && composer install --no-interaction --prefer-dist --no-dev --ignore-platform-req=ext-bcmath) || \
    (cd "${LARAVEL_DIR}" && composer install --no-interaction --prefer-dist --no-dev --ignore-platform-reqs)
  fi
fi

if [[ -f "${LARAVEL_DIR}/.env.example" && ! -f "${LARAVEL_DIR}/.env" ]]; then
  cp "${LARAVEL_DIR}/.env.example" "${LARAVEL_DIR}/.env"
fi

if [[ -f "${LARAVEL_DIR}/.env" ]]; then
  DB_PATH="${LARAVEL_DIR}/database/database.sqlite"
  touch "${DB_PATH}"
  set_env_value() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "${LARAVEL_DIR}/.env"; then
      sed -i "s|^${key}=.*|${key}=${value}|" "${LARAVEL_DIR}/.env"
    else
      echo "${key}=${value}" >> "${LARAVEL_DIR}/.env"
    fi
  }
  strip_env_value() {
    local key="$1"
    sed -i "/^${key}=/d" "${LARAVEL_DIR}/.env"
  }
  set_env_value "DB_CONNECTION" "sqlite"
  # Let Laravel resolve database_path('database.sqlite') so the same .env
  # works under both WSL/Linux PHP and Windows php.exe.
  strip_env_value "DB_DATABASE"
  set_env_value "SESSION_DRIVER" "file"
  set_env_value "QUEUE_CONNECTION" "sync"
  if ! grep -q "^APP_KEY=base64:" "${LARAVEL_DIR}/.env"; then
    (cd "${LARAVEL_DIR}" && php artisan key:generate --force)
  fi

  # Keep one canonical list for SPA auth:
  # - localhost / 127.0.0.1
  # - WSL -> Windows gateway host (useful for browser QA from WSL)
  # - *.trycloudflare.com for remote preview
  HOST_GATEWAY_IP="$(ip route | awk '/default/ {print $3; exit}' 2>/dev/null || true)"

  STATEFUL_ITEMS=(
    "localhost"
    "127.0.0.1"
    "localhost:8787"
    "127.0.0.1:8787"
    "localhost:${NUXT_PORT}"
    "127.0.0.1:${NUXT_PORT}"
    "localhost:${LARAVEL_PORT}"
    "127.0.0.1:${LARAVEL_PORT}"
    "*.trycloudflare.com"
  )

  CORS_ITEMS=(
    "http://127.0.0.1:8787"
    "http://localhost:8787"
    "http://127.0.0.1:${NUXT_PORT}"
    "http://localhost:${NUXT_PORT}"
    "http://127.0.0.1:${LARAVEL_PORT}"
    "http://localhost:${LARAVEL_PORT}"
  )

  if [[ -n "${HOST_GATEWAY_IP}" && "${HOST_GATEWAY_IP}" != "127.0.0.1" ]]; then
    STATEFUL_ITEMS+=(
      "${HOST_GATEWAY_IP}"
      "${HOST_GATEWAY_IP}:8787"
      "${HOST_GATEWAY_IP}:${NUXT_PORT}"
      "${HOST_GATEWAY_IP}:${LARAVEL_PORT}"
    )
    CORS_ITEMS+=(
      "http://${HOST_GATEWAY_IP}:8787"
      "http://${HOST_GATEWAY_IP}:${NUXT_PORT}"
      "http://${HOST_GATEWAY_IP}:${LARAVEL_PORT}"
    )
  fi

  STATEFUL_DOMAINS="$(printf '%s\n' "${STATEFUL_ITEMS[@]}" | awk 'NF && !seen[$0]++' | paste -sd, -)"
  CORS_ORIGINS="$(printf '%s\n' "${CORS_ITEMS[@]}" | awk 'NF && !seen[$0]++' | paste -sd, -)"

  if grep -q "^SANCTUM_STATEFUL_DOMAINS=" "${LARAVEL_DIR}/.env"; then
    sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${STATEFUL_DOMAINS}|" "${LARAVEL_DIR}/.env"
  else
    echo "SANCTUM_STATEFUL_DOMAINS=${STATEFUL_DOMAINS}" >> "${LARAVEL_DIR}/.env"
  fi

  if grep -q "^CORS_ALLOWED_ORIGINS=" "${LARAVEL_DIR}/.env"; then
    sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}|" "${LARAVEL_DIR}/.env"
  else
    echo "CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}" >> "${LARAVEL_DIR}/.env"
  fi

  # Set APP_URL based on environment
  set_env_value "APP_URL" "${NUXT_PUBLIC_API_BASE:-http://127.0.0.1:${LARAVEL_PORT}}"
  if [[ -n "${APP_FRONTEND_URL_OVERRIDE:-}" ]]; then
    set_env_value "APP_FRONTEND_URL" "${APP_FRONTEND_URL_OVERRIDE}"
  fi

  # Run migrations (idempotent)
  (cd "${LARAVEL_DIR}" && php artisan migrate --force 2>/dev/null || true)
  # Ensure default demo accounts exist and are verified
  (cd "${LARAVEL_DIR}" && php artisan db:seed --class=Database\\Seeders\\DatabaseSeeder --force 2>/dev/null || true)
fi

if [[ -f "${NUXT_DIR}/package.json" ]]; then
  if [[ ! -d "${NUXT_DIR}/node_modules" ]]; then
    (cd "${NUXT_DIR}" && npm install)
  else
    (cd "${NUXT_DIR}" && npm install --prefer-offline --no-audit >/tmp/nuxt-npm-install.log 2>&1 || true)
  fi
fi

if [[ "${SKIP_LARAVEL_START:-0}" != "1" ]]; then
  if ! pgrep -f "artisan serve --host 0.0.0.0 --port ${LARAVEL_PORT}" >/dev/null 2>&1; then
    (cd "${LARAVEL_DIR}" && php artisan serve --host 0.0.0.0 --port "${LARAVEL_PORT}" > /tmp/laravel.log 2>&1 &)
  fi
fi

if [[ "${SKIP_NUXT_START:-0}" != "1" ]]; then
  if ! pgrep -f "nuxt.*--port ${NUXT_PORT}" >/dev/null 2>&1; then
    (cd "${NUXT_DIR}" && npx -y node@22 ./node_modules/@nuxt/cli/bin/nuxi.mjs dev --host 0.0.0.0 --port "${NUXT_PORT}" > /tmp/nuxt.log 2>&1 &)
    sleep 4
    if ! pgrep -f "nuxt.*--port ${NUXT_PORT}" >/dev/null 2>&1; then
      (cd "${NUXT_DIR}" && npx -y node@22 ./node_modules/@nuxt/cli/bin/nuxi.mjs dev --host 0.0.0.0 --port "${NUXT_PORT}" >> /tmp/nuxt.log 2>&1 &)
    fi
  fi
fi

echo "Backend API base: ${NUXT_PUBLIC_API_BASE}"
echo "Nuxt port: ${NUXT_PORT}"
echo "Laravel port: ${LARAVEL_PORT}"
echo "Frontend dir: ${NUXT_DIR}"
echo "Backend dir: ${LARAVEL_DIR}"
