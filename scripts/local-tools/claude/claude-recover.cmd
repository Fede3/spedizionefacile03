@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
for %%I in ("%SCRIPT_DIR%..\..\..") do set "PROJECT_ROOT=%%~fI"

rem Repair key variables that broken launchers sometimes omit.
if not defined SystemRoot if defined windir set "SystemRoot=%windir%"
if not defined SystemRoot set "SystemRoot=C:\Windows"
if not defined SystemDrive set "SystemDrive=%SystemRoot:~0,2%"
if not defined USERPROFILE set "USERPROFILE=%HOMEDRIVE%%HOMEPATH%"
if not defined HOMEDRIVE for %%I in ("%USERPROFILE%") do set "HOMEDRIVE=%%~dI"
if not defined HOMEPATH if defined USERPROFILE set "HOMEPATH=%USERPROFILE:*:=%"
if not defined APPDATA set "APPDATA=%USERPROFILE%\AppData\Roaming"
if not defined LOCALAPPDATA set "LOCALAPPDATA=%USERPROFILE%\AppData\Local"
if not defined TEMP set "TEMP=%LOCALAPPDATA%\Temp"
if not defined TMP set "TMP=%TEMP%"
if not defined ProgramFiles set "ProgramFiles=%SystemDrive%\Program Files"
if not defined ProgramData set "ProgramData=%SystemDrive%\ProgramData"
if not defined PUBLIC set "PUBLIC=%SystemDrive%\Users\Public"
set "ComSpec=%SystemRoot%\System32\cmd.exe"

rem Prefer Git Bash on Windows, per Claude Code docs.
if exist "%SystemDrive%\Program Files\Git\bin\bash.exe" (
  set "CLAUDE_CODE_GIT_BASH_PATH=%SystemDrive%\Program Files\Git\bin\bash.exe"
  set "GIT_BIN_DIR=%SystemDrive%\Program Files\Git\bin"
  set "GIT_CMD_DIR=%SystemDrive%\Program Files\Git\cmd"
)
if exist "%SystemDrive%\Program Files (x86)\Git\bin\bash.exe" (
  set "CLAUDE_CODE_GIT_BASH_PATH=%SystemDrive%\Program Files (x86)\Git\bin\bash.exe"
  set "GIT_BIN_DIR=%SystemDrive%\Program Files (x86)\Git\bin"
  set "GIT_CMD_DIR=%SystemDrive%\Program Files (x86)\Git\cmd"
)
if defined GIT_BIN_DIR set "PATH=%GIT_BIN_DIR%;%GIT_CMD_DIR%;%PATH%"

set "CLAUDE_HOME=%USERPROFILE%\.claude"
set "RECOVERY_ROOT=%USERPROFILE%\Desktop\Documentazione importante\CLAUDE_RECOVERY"
set "LATEST_SESSION_FILE=%RECOVERY_ROOT%\LATEST_SESSION.json"

set "CLAUDE_CMD="
where claude >nul 2>nul && set "CLAUDE_CMD=claude"
if not defined CLAUDE_CMD if exist "%USERPROFILE%\.local\bin\claude.exe" set "CLAUDE_CMD=%USERPROFILE%\.local\bin\claude.exe"
if not defined CLAUDE_CMD if exist "%APPDATA%\npm\claude.cmd" set "CLAUDE_CMD=%APPDATA%\npm\claude.cmd"
if not defined CLAUDE_CMD if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links\claude.exe" set "CLAUDE_CMD=%LOCALAPPDATA%\Microsoft\WinGet\Links\claude.exe"

if not defined CLAUDE_CMD (
  echo Claude non trovato nel PATH.
  echo Prova ad aprire CMD e lanciare manualmente: claude --continue
  pause
  exit /b 1
)

if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" if exist "%SCRIPT_DIR%claude-session-snapshot.ps1" (
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%claude-session-snapshot.ps1" -ProjectRoot "%PROJECT_ROOT%"
)

set "CLAUDE_SESSION_ID="
if exist "%LATEST_SESSION_FILE%" (
  for /f "usebackq delims=" %%I in (`"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$data = Get-Content -LiteralPath '%LATEST_SESSION_FILE%' -Raw | ConvertFrom-Json; [Console]::Write($data.sessionId)"`) do set "CLAUDE_SESSION_ID=%%I"
)

echo Recovery bundle aggiornato in "%RECOVERY_ROOT%".
echo Provo a riaprire la sessione Claude completa per questa cartella...
echo.

cd /d "%PROJECT_ROOT%"

if defined CLAUDE_SESSION_ID (
  if /I "%CLAUDE_CMD%"=="claude" (
    call claude --resume "%CLAUDE_SESSION_ID%"
  ) else (
    call "%CLAUDE_CMD%" --resume "%CLAUDE_SESSION_ID%"
  )
  set "RC=%ERRORLEVEL%"
  if "%RC%"=="0" exit /b 0
  echo.
  echo Resume diretto non riuscito ^(sessione %CLAUDE_SESSION_ID%, codice %RC%^). Provo con continue...
  echo.
)

if /I "%CLAUDE_CMD%"=="claude" (
  call claude --continue
) else (
  call "%CLAUDE_CMD%" --continue
)
set "RC=%ERRORLEVEL%"

if "%RC%"=="0" exit /b 0

echo.
echo Continue non riuscito ^(codice %RC%^). Apro il selettore delle sessioni salvate...
echo.

if /I "%CLAUDE_CMD%"=="claude" (
  call claude --resume
) else (
  call "%CLAUDE_CMD%" --resume
)
exit /b %ERRORLEVEL%
