@echo off
title Installazione Ubuntu WSL2 per Codex — ESEGUI COME AMMINISTRATORE

echo ==========================================================
echo  SETUP CODEX SU WSL2 — SpedizioneFacile
echo  Questo script installa Ubuntu e configura Codex
echo  DEVE essere eseguito come Amministratore
echo ==========================================================
echo.

:: Verifica Admin
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERRORE: Eseguire come Amministratore!
    echo Clicca destro su questo file e scegli "Esegui come amministratore"
    pause
    exit /b 1
)

echo [1/5] Installazione Ubuntu su WSL2...
wsl --install -d Ubuntu --no-launch
if %ERRORLEVEL% NEQ 0 (
    echo Provo installazione alternativa...
    wsl --install Ubuntu
)

echo.
echo [2/5] Ubuntu installato! Avvio configurazione iniziale...
echo ATTENZIONE: Ti verrà chiesto di creare username e password per Ubuntu.
echo Usa: username = feder, password semplice che ricordi.
echo.
pause
wsl -d Ubuntu -- bash -c "echo 'Ubuntu pronto'"

echo.
echo [3/5] Installazione Node.js in Ubuntu...
wsl -d Ubuntu -- bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt-get install -y nodejs"

echo.
echo [4/5] Installazione Codex in Ubuntu...
wsl -d Ubuntu -- bash -c "npm install -g @openai/codex@latest"

echo.
echo [5/5] Copiare auth da Windows a Ubuntu...
wsl -d Ubuntu -- bash -c "mkdir -p ~/.codex && cp /mnt/c/Users/Feder/.codex/auth.json ~/.codex/ 2>/dev/null && echo 'Auth copiata OK'"

echo.
echo ==========================================================
echo  INSTALLAZIONE COMPLETATA!
echo.
echo  Per avviare Codex su SpedizioneFacile:
echo  1. Apri Windows Terminal
echo  2. Scegli "Ubuntu" come profilo
echo  3. Digita:
echo     cd /mnt/c/Users/Feder/Desktop/spedizionefacile
echo     codex
echo.
echo  OPPURE usa AVVIA_CODEX_WSL.bat (creato ora sul desktop)
echo ==========================================================

:: Crea launcher WSL per dopo
echo @echo off > "%USERPROFILE%\Desktop\AVVIA_CODEX_WSL.bat"
echo wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/Feder/Desktop/spedizionefacile && codex" >> "%USERPROFILE%\Desktop\AVVIA_CODEX_WSL.bat"
echo Launcher creato sul Desktop: AVVIA_CODEX_WSL.bat

pause
