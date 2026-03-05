@echo off
REM Script di preparazione per deploy Netlify (Windows)
REM Esegui questo prima di pushare su Git

echo ==========================================
echo PREPARAZIONE DEPLOY NETLIFY
echo ==========================================
echo.

REM 1. Installa dipendenze
echo [1/5] Installazione dipendenze...
call npm install --legacy-peer-deps

REM 2. Verifica che il build funzioni
echo.
echo [2/5] Test build locale...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ERRORE: Build fallito!
    echo Risolvi gli errori prima di deployare su Netlify.
    pause
    exit /b 1
)

REM 3. Verifica file necessari
echo.
echo [3/5] Verifica file configurazione...

if not exist "netlify.toml" (
    echo ERRORE: netlify.toml mancante!
    pause
    exit /b 1
)

if not exist ".env.production" (
    echo WARNING: .env.production mancante (opzionale^)
)

echo File configurazione OK

REM 4. Riepilogo
echo.
echo ==========================================
echo PREPARAZIONE COMPLETATA
echo ==========================================
echo.
echo PROSSIMI PASSI:
echo.
echo 1. Crea repository Git (se non esiste^):
echo    git init
echo    git add .
echo    git commit -m "Initial commit"
echo.
echo 2. Pusha su GitHub/GitLab:
echo    git remote add origin URL_REPO
echo    git push -u origin main
echo.
echo 3. Vai su Netlify (https://app.netlify.com^):
echo    - New site from Git
echo    - Seleziona il tuo repository
echo    - Build command: npm run build
echo    - Publish directory: .output/public
echo.
echo 4. Aggiungi variabili d'ambiente su Netlify:
echo    - NUXT_PUBLIC_API_BASE
echo    - NUXT_PUBLIC_STRIPE_KEY
echo.
echo 5. Aggiorna Laravel .env con dominio Netlify
echo.
echo ==========================================
echo.
pause
