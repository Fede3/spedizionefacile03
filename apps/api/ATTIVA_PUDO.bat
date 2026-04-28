@echo off
echo ========================================
echo ATTIVAZIONE SISTEMA PUDO
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Creazione tabella pudo_points...
php artisan migrate --path=database/migrations/2026_03_03_100000_create_pudo_points_table.php --force
if %errorlevel% neq 0 (
    echo ERRORE: Migrazione fallita
    pause
    exit /b 1
)
echo OK - Tabella creata
echo.

echo [2/3] Inserimento 45+ punti PUDO...
php artisan db:seed --class=PudoPointSeeder --force
if %errorlevel% neq 0 (
    echo ERRORE: Seeding fallito
    pause
    exit /b 1
)
echo OK - PUDO inseriti
echo.

echo [3/3] Verifica...
php artisan tinker --execute="echo 'PUDO totali: ' . App\Models\PudoPoint::count() . PHP_EOL;"
echo.

echo ========================================
echo COMPLETATO!
echo ========================================
echo.
echo Il sistema PUDO e' ora attivo.
echo Puoi chiudere questa finestra e ricaricare il sito.
echo.
pause
