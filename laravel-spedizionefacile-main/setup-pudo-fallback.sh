#!/bin/bash
# Script di attivazione PUDO Fallback System

echo "🚀 Attivazione PUDO Fallback System..."
echo ""

# 1. Esegui migration
echo "📦 Step 1/3: Creazione tabella pudo_points..."
php artisan migrate --force

# 2. Popola database
echo "📦 Step 2/3: Inserimento 45+ punti PUDO mock..."
php artisan db:seed --class=PudoPointSeeder

# 3. Verifica
echo "📦 Step 3/3: Verifica dati inseriti..."
php artisan tinker --execute="echo 'Punti PUDO inseriti: ' . App\Models\PudoPoint::count() . PHP_EOL;"

echo ""
echo "✅ PUDO Fallback System attivato!"
echo ""
echo "Test rapido:"
echo "curl -X POST http://localhost:8000/api/brt/pudo/search -H 'Content-Type: application/json' -d '{\"city\":\"Roma\",\"zip_code\":\"00186\"}'"
