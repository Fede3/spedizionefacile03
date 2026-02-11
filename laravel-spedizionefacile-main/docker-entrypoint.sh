#!/bin/bash

set -e

# Wait for database to be ready
if [ ! -z "$DB_HOST" ]; then
    echo "Waiting for database at $DB_HOST:$DB_PORT..."
    until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null || [ $ATTEMPT_COUNTER -eq 60 ]; do
        ATTEMPT_COUNTER=$((ATTEMPT_COUNTER+1))
        echo "Waiting for database... attempt $ATTEMPT_COUNTER"
        sleep 1
    done
    
    if [ $ATTEMPT_COUNTER -eq 60 ]; then
        echo "Database did not become ready in time"
        exit 1
    fi
    
    echo "Database is ready!"
    
    # Run migrations
    echo "Running migrations..."
    php artisan migrate --force
    
    # Seed database if needed
    if [ "$APP_ENV" = "production" ]; then
        echo "Seeding database..."
        php artisan db:seed --force
    fi
fi

# Start Apache
exec apache2-foreground
