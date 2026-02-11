#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

if [[ -f "${ROOT_DIR}/laravel-spedizionefacile-main/composer.json" ]]; then
  if [[ ! -f "${ROOT_DIR}/laravel-spedizionefacile-main/vendor/autoload.php" ]]; then
    (cd "${ROOT_DIR}/laravel-spedizionefacile-main" && composer install --no-interaction --prefer-dist --no-dev --ignore-platform-req=ext-bcmath) || \
    (cd "${ROOT_DIR}/laravel-spedizionefacile-main" && composer install --no-interaction --prefer-dist --no-dev --ignore-platform-reqs)
  fi
fi

if [[ -f "${ROOT_DIR}/laravel-spedizionefacile-main/.env.example" && ! -f "${ROOT_DIR}/laravel-spedizionefacile-main/.env" ]]; then
  cp "${ROOT_DIR}/laravel-spedizionefacile-main/.env.example" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
fi

if [[ -f "${ROOT_DIR}/laravel-spedizionefacile-main/.env" ]]; then
  DB_PATH="${ROOT_DIR}/laravel-spedizionefacile-main/database/database.sqlite"
  touch "${DB_PATH}"
  if grep -q "^DB_CONNECTION=" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=sqlite|" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  else
    echo "DB_CONNECTION=sqlite" >> "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  fi
  if grep -q "^DB_DATABASE=" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_PATH}|" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  else
    echo "DB_DATABASE=${DB_PATH}" >> "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  fi
  if ! grep -q "^APP_KEY=base64:" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    (cd "${ROOT_DIR}/laravel-spedizionefacile-main" && php artisan key:generate --force)
  fi

  # Ensure Sanctum/CORS include direct API port
  STATEFUL_DOMAINS="127.0.0.1:8787,localhost:8787,127.0.0.1:${NUXT_PORT},localhost:${NUXT_PORT},127.0.0.1:${LARAVEL_PORT},localhost:${LARAVEL_PORT}"
  CORS_ORIGINS="http://127.0.0.1:8787,http://localhost:8787,http://127.0.0.1:${NUXT_PORT},http://localhost:${NUXT_PORT},http://127.0.0.1:${LARAVEL_PORT},http://localhost:${LARAVEL_PORT}"

  if grep -q "^SANCTUM_STATEFUL_DOMAINS=" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${STATEFUL_DOMAINS}|" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  else
    echo "SANCTUM_STATEFUL_DOMAINS=${STATEFUL_DOMAINS}" >> "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  fi

  if grep -q "^CORS_ALLOWED_ORIGINS=" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}|" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  else
    echo "CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}" >> "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  fi

  # Set APP_URL based on environment
  if grep -q "^APP_URL=" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    sed -i "s|^APP_URL=.*|APP_URL=${NUXT_PUBLIC_API_BASE:-http://127.0.0.1:${LARAVEL_PORT}}|" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  fi
  if grep -q "^APP_FRONTEND_URL=" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"; then
    sed -i "s|^APP_FRONTEND_URL=.*|APP_FRONTEND_URL=${NUXT_PUBLIC_API_BASE:-http://127.0.0.1:${LARAVEL_PORT}}|" "${ROOT_DIR}/laravel-spedizionefacile-main/.env"
  fi

  # Run migrations (idempotent)
  (cd "${ROOT_DIR}/laravel-spedizionefacile-main" && php artisan migrate --force 2>/dev/null || true)
fi

if [[ -f "${ROOT_DIR}/nuxt-spedizionefacile-master/package.json" ]]; then
  if [[ ! -d "${ROOT_DIR}/nuxt-spedizionefacile-master/node_modules" ]]; then
    (cd "${ROOT_DIR}/nuxt-spedizionefacile-master" && npm install)
  else
    (cd "${ROOT_DIR}/nuxt-spedizionefacile-master" && npm install --prefer-offline --no-audit >/tmp/nuxt-npm-install.log 2>&1 || true)
  fi
fi

if [[ "${SKIP_LARAVEL_START:-0}" != "1" ]]; then
  if ! pgrep -f "artisan serve --host 0.0.0.0 --port ${LARAVEL_PORT}" >/dev/null 2>&1; then
    (cd "${ROOT_DIR}/laravel-spedizionefacile-main" && php artisan serve --host 0.0.0.0 --port "${LARAVEL_PORT}" > /tmp/laravel.log 2>&1 &)
  fi
fi

if [[ "${SKIP_NUXT_START:-0}" != "1" ]]; then
  if ! pgrep -f "nuxt.*--port ${NUXT_PORT}" >/dev/null 2>&1; then
    (cd "${ROOT_DIR}/nuxt-spedizionefacile-master" && npm run dev -- --host 0.0.0.0 --port "${NUXT_PORT}" > /tmp/nuxt.log 2>&1 &)
    sleep 4
    if ! pgrep -f "nuxt.*--port ${NUXT_PORT}" >/dev/null 2>&1; then
      (cd "${ROOT_DIR}/nuxt-spedizionefacile-master" && npx nuxi dev --host 0.0.0.0 --port "${NUXT_PORT}" >> /tmp/nuxt.log 2>&1 &)
    fi
  fi
fi

echo "Backend API base: ${NUXT_PUBLIC_API_BASE}"
echo "Nuxt port: ${NUXT_PORT}"
echo "Laravel port: ${LARAVEL_PORT}"
