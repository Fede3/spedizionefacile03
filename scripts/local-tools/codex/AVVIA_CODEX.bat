@echo off
title Codex — SpedizioneFacile

:: Usa Git Bash per bypassare errore PowerShell 8009001d
:: Doppio click su questo file per avviare Codex correttamente

cd /d "%~dp0"

:: Cerca Git Bash
set "BASH="
if exist "C:\Program Files\Git\bin\bash.exe" set "BASH=C:\Program Files\Git\bin\bash.exe"
if exist "C:\Program Files (x86)\Git\bin\bash.exe" set "BASH=C:\Program Files (x86)\Git\bin\bash.exe"

if not defined BASH (
    echo Git Bash non trovato. Installa Git for Windows da https://git-scm.com
    pause
    exit /b 1
)

echo Avvio Codex da Git Bash...
echo Cartella: %~dp0
echo.

"%BASH%" --login -i -c "cd '%~dp0' && codex"
