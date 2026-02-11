$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$laravelDir = Join-Path $root 'laravel-spedizionefacile-main'
$nuxtDir = Join-Path $root 'nuxt-spedizionefacile-master'

$env:NUXT_PUBLIC_API_BASE = if ($env:NUXT_PUBLIC_API_BASE) { $env:NUXT_PUBLIC_API_BASE } else { 'http://127.0.0.1:8787' }

if (-not (Get-Command php -ErrorAction SilentlyContinue)) { throw 'PHP non trovato nel PATH.' }
if (-not (Get-Command composer -ErrorAction SilentlyContinue)) { throw 'Composer non trovato nel PATH.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm non trovato nel PATH.' }

if (-not (Test-Path (Join-Path $laravelDir 'vendor\autoload.php'))) {
  Push-Location $laravelDir
  try {
    composer install --no-interaction --prefer-dist --no-dev
  } catch {
    composer install --no-interaction --prefer-dist --no-dev --ignore-platform-req=php
  }
  Pop-Location
}

$envFile = Join-Path $laravelDir '.env'
if (-not (Test-Path $envFile) -and (Test-Path (Join-Path $laravelDir '.env.example'))) {
  Copy-Item (Join-Path $laravelDir '.env.example') $envFile -Force
}

$dbPath = Join-Path $laravelDir 'database\database.sqlite'
if (-not (Test-Path $dbPath)) { New-Item -ItemType File -Path $dbPath -Force | Out-Null }

if (Test-Path $envFile) {
  $envContent = Get-Content $envFile -Raw
  if ($envContent -match '(?m)^DB_CONNECTION=') {
    $envContent = [regex]::Replace($envContent, '(?m)^DB_CONNECTION=.*$', 'DB_CONNECTION=sqlite')
  } else {
    $envContent += "`nDB_CONNECTION=sqlite"
  }

  if ($envContent -match '(?m)^DB_DATABASE=') {
    $envContent = [regex]::Replace($envContent, '(?m)^DB_DATABASE=.*$', "DB_DATABASE=$dbPath")
  } else {
    $envContent += "`nDB_DATABASE=$dbPath"
  }

  Set-Content -Path $envFile -Value $envContent -NoNewline

  Push-Location $laravelDir
  php artisan key:generate --force | Out-Null
  Pop-Location
}

if (-not (Test-Path (Join-Path $nuxtDir 'node_modules'))) {
  Push-Location $nuxtDir
  npm install
  Pop-Location
}

Get-Process | Where-Object { $_.ProcessName -in @('php','node','caddy') } | ForEach-Object {
  try { if ($_.Path -match 'php|node|caddy') { } } catch {}
}

Start-Process -FilePath powershell -ArgumentList '-NoProfile','-Command',"Set-Location '$laravelDir'; php artisan serve --host 0.0.0.0 --port 8000 *> $env:TEMP\\laravel.log" -WindowStyle Minimized
Start-Process -FilePath powershell -ArgumentList '-NoProfile','-Command',"Set-Location '$nuxtDir'; npm run dev -- --host 0.0.0.0 --port 3000 *> $env:TEMP\\nuxt.log" -WindowStyle Minimized

if (Get-Command caddy -ErrorAction SilentlyContinue) {
  $caddyFile = Join-Path $root 'Caddyfile'
  if (-not (Test-Path $caddyFile)) { $caddyFile = Join-Path $root 'Caddyfile.example' }
  Start-Process -FilePath powershell -ArgumentList '-NoProfile','-Command',"Set-Location '$root'; caddy run --config '$caddyFile' *> $env:TEMP\\caddy.log" -WindowStyle Minimized
  Write-Output '✅ Apri: http://127.0.0.1:8787'
} else {
  Write-Output '⚠️ Caddy non trovato. Apri: http://127.0.0.1:3000 (Nuxt)'
}

Write-Output "ℹ️ Log: $env:TEMP\\nuxt.log, $env:TEMP\\laravel.log"
