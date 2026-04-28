#!/bin/sh
# =============================================================================
# docker-entrypoint.sh — Sprint 7.3
# =============================================================================
# Hook di startup del container:
#   1. Attende DB disponibile
#   2. Esegue migrazioni (idempotenti grazie a --force)
#   3. Genera cache config/route/view/event per performance produzione
#   4. Riavvia queue worker (svuota PID stale)
#   5. Delega a supervisord che avvia nginx + php-fpm
#
# Errori in qualunque step -> exit immediato (fail-fast).
# =============================================================================

set -eu

cd /var/www/html

log() {
    printf '[entrypoint] %s\n' "$*"
}

# ---- Default env ------------------------------------------------------------
# ENABLE_QUEUE_WORKER: "true" o "false" (default false su container web)
: "${ENABLE_QUEUE_WORKER:=false}"
export ENABLE_QUEUE_WORKER

# ---- Attesa database -------------------------------------------------------
if [ -n "${DB_HOST:-}" ] && [ -n "${DB_PORT:-}" ]; then
    log "Waiting for database at $DB_HOST:$DB_PORT..."
    ATTEMPT=0
    # nc non disponibile in alpine-base: usiamo /dev/tcp via sh (non supportato
    # in ash), quindi ricorriamo a PHP che e' sempre presente.
    until php -r "exit(@fsockopen('$DB_HOST', (int)'$DB_PORT', \$e, \$s, 2) ? 0 : 1);" 2>/dev/null; do
        ATTEMPT=$((ATTEMPT + 1))
        if [ "$ATTEMPT" -ge 60 ]; then
            log "Database not reachable after 60 attempts — aborting."
            exit 1
        fi
        log "  attempt $ATTEMPT/60..."
        sleep 1
    done
    log "Database is ready."

    # ---- Migrazioni --------------------------------------------------------
    log "Running migrations..."
    php artisan migrate --force --no-interaction

    # Storage symlink (idempotente)
    php artisan storage:link 2>/dev/null || true

    # Seed solo se esplicitamente richiesto
    if [ "${RUN_SEEDERS:-false}" = "true" ]; then
        log "Seeding database..."
        php artisan db:seed --force --no-interaction
    fi
fi

# ---- Cache Laravel (performance produzione) --------------------------------
# Rigenerate ad ogni boot: il codice potrebbe essere cambiato da ultimo run.
log "Building Laravel caches..."
php artisan config:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache || true   # event:cache opzionale (solo se listener registrati)

# ---- Queue restart ---------------------------------------------------------
# Segnala ai worker esistenti di riavviarsi dopo deploy (SIGUSR1 graceful)
php artisan queue:restart >/dev/null 2>&1 || true

log "Startup complete — handing off to supervisord (nginx + php-fpm)."

# ---- Exec final (PID 1 = supervisord) -------------------------------------
exec "$@"
