#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LARAVEL_DIR="${ROOT_DIR}/laravel-spedizionefacile-main"
NUXT_DIR="${ROOT_DIR}/nuxt-spedizionefacile-master"

LARAVEL_PORT="${LARAVEL_PORT:-8000}"
NUXT_PORT="${NUXT_PORT:-3001}"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

clear_screen() {
  printf '\033[2J\033[H'
}

show_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}  ║       SPEDIZIONE FACILE - PANNELLO       ║${RESET}"
  echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════╝${RESET}"
  echo ""
}

show_status() {
  local laravel_status="${RED}Spento${RESET}"
  local nuxt_status="${RED}Spento${RESET}"

  if pgrep -f "artisan serve.*--port ${LARAVEL_PORT}" >/dev/null 2>&1; then
    laravel_status="${GREEN}Attivo${RESET} (porta ${LARAVEL_PORT})"
  fi
  if pgrep -f "nuxt.*--port ${NUXT_PORT}" >/dev/null 2>&1 || pgrep -f "nuxi.*--port ${NUXT_PORT}" >/dev/null 2>&1; then
    nuxt_status="${GREEN}Attivo${RESET} (porta ${NUXT_PORT})"
  fi

  echo -e "  ${DIM}Stato servizi:${RESET}"
  echo -e "    Laravel:  ${laravel_status}"
  echo -e "    Nuxt:     ${nuxt_status}"
  echo ""
}

show_menu() {
  echo -e "  ${BOLD}Premi un tasto:${RESET}"
  echo ""
  echo -e "    ${GREEN}${BOLD}1${RESET}  Avvia tutto"
  echo -e "    ${RED}${BOLD}2${RESET}  Chiudi tutto"
  echo -e "    ${CYAN}${BOLD}3${RESET}  Vedi log Laravel"
  echo -e "    ${CYAN}${BOLD}4${RESET}  Vedi log Nuxt"
  echo -e "    ${YELLOW}${BOLD}q${RESET}  Esci"
  echo ""
  echo -e "  ${DIM}────────────────────────────────────────────${RESET}"
  echo ""
}

stop_all() {
  echo -e "\n  ${YELLOW}Chiusura servizi...${RESET}"
  pkill -f "artisan serve.*--port ${LARAVEL_PORT}" 2>/dev/null || true
  pkill -f "nuxt.*--port ${NUXT_PORT}" 2>/dev/null || true
  pkill -f "nuxi.*--port ${NUXT_PORT}" 2>/dev/null || true
  pkill -f "node.*${NUXT_PORT}" 2>/dev/null || true
  sleep 1
  echo -e "  ${GREEN}Tutti i servizi chiusi.${RESET}\n"
}

setup_env() {
  # Setup .env if needed
  if [[ -f "${LARAVEL_DIR}/.env.example" && ! -f "${LARAVEL_DIR}/.env" ]]; then
    cp "${LARAVEL_DIR}/.env.example" "${LARAVEL_DIR}/.env"
    echo -e "  ${DIM}Creato .env da .env.example${RESET}"
  fi

  if [[ -f "${LARAVEL_DIR}/.env" ]]; then
    local DB_PATH="${LARAVEL_DIR}/database/database.sqlite"
    touch "${DB_PATH}"

    if grep -q "^DB_CONNECTION=" "${LARAVEL_DIR}/.env"; then
      sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=sqlite|" "${LARAVEL_DIR}/.env"
    else
      echo "DB_CONNECTION=sqlite" >> "${LARAVEL_DIR}/.env"
    fi

    if grep -q "^DB_DATABASE=" "${LARAVEL_DIR}/.env"; then
      sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_PATH}|" "${LARAVEL_DIR}/.env"
    else
      echo "DB_DATABASE=${DB_PATH}" >> "${LARAVEL_DIR}/.env"
    fi

    if ! grep -q "^APP_KEY=base64:" "${LARAVEL_DIR}/.env"; then
      (cd "${LARAVEL_DIR}" && php artisan key:generate --force 2>/dev/null) || true
    fi
  fi
}

start_all() {
  stop_all

  echo -e "  ${CYAN}Preparazione ambiente...${RESET}"

  setup_env

  # Composer install if needed
  if [[ ! -d "${LARAVEL_DIR}/vendor" ]]; then
    echo -e "  ${YELLOW}Installazione dipendenze PHP...${RESET}"
    (cd "${LARAVEL_DIR}" && composer install --no-interaction --prefer-dist --no-dev --ignore-platform-reqs 2>/tmp/composer_err.log) || true
  fi

  # NPM install if needed
  if [[ ! -d "${NUXT_DIR}/node_modules" ]]; then
    echo -e "  ${YELLOW}Installazione dipendenze Node...${RESET}"
    (cd "${NUXT_DIR}" && npm install 2>/tmp/npm_err.log) || true
  fi

  # Run migrations
  echo -e "  ${DIM}Esecuzione migrazioni...${RESET}"
  (cd "${LARAVEL_DIR}" && php artisan migrate --force 2>/dev/null) || true

  # Determine API base
  if [[ -z "${NUXT_PUBLIC_API_BASE:-}" ]]; then
    export NUXT_PUBLIC_API_BASE="http://127.0.0.1:${LARAVEL_PORT}"
  fi

  # Start Laravel
  echo -e "  ${CYAN}Avvio Laravel (porta ${LARAVEL_PORT})...${RESET}"
  (cd "${LARAVEL_DIR}" && php artisan serve --host 0.0.0.0 --port "${LARAVEL_PORT}" > /tmp/laravel.log 2>&1 &)

  # Start Nuxt
  echo -e "  ${CYAN}Avvio Nuxt (porta ${NUXT_PORT})...${RESET}"
  (cd "${NUXT_DIR}" && npm run dev -- --host 0.0.0.0 --port "${NUXT_PORT}" > /tmp/nuxt.log 2>&1 &)

  # Wait for services
  echo -e "  ${DIM}Attesa avvio servizi...${RESET}"
  local retries=0
  while ! curl -s "http://127.0.0.1:${LARAVEL_PORT}" >/dev/null 2>&1 && [[ $retries -lt 30 ]]; do
    sleep 1
    retries=$((retries + 1))
  done

  retries=0
  while ! curl -s "http://127.0.0.1:${NUXT_PORT}" >/dev/null 2>&1 && [[ $retries -lt 60 ]]; do
    sleep 2
    retries=$((retries + 1))
  done

  echo ""
  echo -e "  ${GREEN}${BOLD}Servizi avviati!${RESET}"
  echo -e "    Frontend: ${CYAN}http://127.0.0.1:${NUXT_PORT}${RESET}"
  echo -e "    Backend:  ${CYAN}http://127.0.0.1:${LARAVEL_PORT}${RESET}"
  echo ""
}

show_log() {
  local logfile="$1"
  local name="$2"
  if [[ -f "$logfile" ]]; then
    echo -e "\n  ${CYAN}Log ${name} (ultime 30 righe, Ctrl+C per tornare):${RESET}\n"
    tail -n 30 -f "$logfile" 2>/dev/null || true
  else
    echo -e "\n  ${YELLOW}Log ${name} non trovato.${RESET}\n"
    sleep 1
  fi
}

# ─── Main Loop ───
while true; do
  clear_screen
  show_banner
  show_status
  show_menu

  # Single key press - no Enter needed
  read -rsn1 key

  case "$key" in
    1) start_all; echo -e "  ${DIM}Premi un tasto per tornare al menu...${RESET}"; read -rsn1 ;;
    2) stop_all; sleep 1 ;;
    3) show_log /tmp/laravel.log "Laravel" ;;
    4) show_log /tmp/nuxt.log "Nuxt" ;;
    q|Q) echo -e "\n  ${GREEN}Arrivederci!${RESET}\n"; exit 0 ;;
    *) ;;
  esac
done
