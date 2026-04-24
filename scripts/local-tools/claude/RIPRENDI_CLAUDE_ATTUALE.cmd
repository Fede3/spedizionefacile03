@echo off
cd /d "C:\Users\Feder\Desktop\spedizionefacile"
claude -r 0792a169-9061-4c0c-815e-a45f516fb72c
if errorlevel 1 (
  echo.
  echo Resume fallito, provo continue...
  claude -c
)
