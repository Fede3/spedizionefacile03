#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/tmp-diagnostica"
REPORT_FILE="${REPORT_DIR}/report.txt"

mkdir -p "$REPORT_DIR"

{
  echo "=== DIAGNOSTICA TUTTOINSIEME ==="
  echo "Data: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "Root: $ROOT_DIR"
  echo

  echo "[1] Versioni strumenti"
  echo "- php: $(php -v 2>/dev/null | head -n 1 || echo 'non trovato')"
  echo "- composer: $(composer --version 2>/dev/null || echo 'non trovato')"
  echo "- node: $(node -v 2>/dev/null || echo 'non trovato')"
  echo "- npm: $(npm -v 2>/dev/null || echo 'non trovato')"
  echo "- cloudflared: $(cloudflared --version 2>/dev/null | head -n 1 || echo 'non trovato')"
  echo

  echo "[2] Processi attivi"
  ps aux | rg -n "artisan serve|nuxt dev|nuxi dev|cloudflared tunnel" || true
  echo

  echo "[3] Porte locali"
  (ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || true) | rg ":(3000|8000|8787)" || true
  echo

  echo "[4] Endpoint locali"
  echo "- frontend (3000):"; curl -sS -I http://127.0.0.1:3000 | head -n 1 || true
  echo "- backend (8000):"; curl -sS -I http://127.0.0.1:8000 | head -n 1 || true
  echo "- endpoint 8787 (Caddy oppure metrics cloudflared):"; curl -sS -I http://127.0.0.1:8787 | head -n 1 || true
  echo

  echo "[5] URL tunnel rilevati"
  if [[ -f /tmp/cloudflared-frontend.log ]]; then
    echo "- frontend log: /tmp/cloudflared-frontend.log"
    rg -o "https://[a-zA-Z0-9-]+\\.trycloudflare\\.com" /tmp/cloudflared-frontend.log | tail -n 3 || true
  else
    echo "- frontend log non trovato"
  fi
  if [[ -f /tmp/cloudflared-backend.log ]]; then
    echo "- backend log: /tmp/cloudflared-backend.log"
    rg -o "https://[a-zA-Z0-9-]+\\.trycloudflare\\.com" /tmp/cloudflared-backend.log | tail -n 3 || true
  else
    echo "- backend log non trovato"
  fi
  echo

  echo "[6] Ultime righe log applicazione"
  echo "--- /tmp/nuxt.log ---"
  tail -n 80 /tmp/nuxt.log 2>/dev/null || echo "nuxt.log non trovato"
  echo
  echo "--- /tmp/laravel.log ---"
  tail -n 80 /tmp/laravel.log 2>/dev/null || echo "laravel.log non trovato"
  echo
  echo "--- /tmp/cloudflared-frontend.log ---"
  tail -n 80 /tmp/cloudflared-frontend.log 2>/dev/null || echo "cloudflared-frontend.log non trovato"
  echo
  echo "--- /tmp/cloudflared-backend.log ---"
  tail -n 80 /tmp/cloudflared-backend.log 2>/dev/null || echo "cloudflared-backend.log non trovato"
  echo

  echo "[7] Repo stato"
  git -C "$ROOT_DIR" status -sb || true
} > "$REPORT_FILE"

echo "Report creato: $REPORT_FILE"
echo "Incollami il contenuto di quel file e analizzo tutto io."
