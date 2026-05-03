#!/usr/bin/env sh
set -e

# Cache config + route + view per produzione
php artisan config:cache --no-interaction || true
php artisan route:cache --no-interaction || true
php artisan view:cache --no-interaction || true

# Migrate solo se variabile RUN_MIGRATIONS=1
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  php artisan migrate --force --no-interaction
fi

# Esegui CMD (php-fpm, queue:work, serve, ecc.)
exec "$@"
