$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

function Resolve-ProjectDir([string]$basePath, [string]$preferredName, [string]$markerFile) {
  $preferred = Join-Path $basePath $preferredName
  if (Test-Path (Join-Path $preferred $markerFile)) { return $preferred }

  $candidate = Get-ChildItem -Path $basePath -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName $markerFile) } |
    Select-Object -First 1

  if ($candidate) { return $candidate.FullName }
  throw "Cartella progetto non trovata (marker: $markerFile) in $basePath"
}

$laravelDir = Resolve-ProjectDir -basePath $root -preferredName 'laravel-spedizionefacile-main' -markerFile 'artisan'
$nuxtDir = Resolve-ProjectDir -basePath $root -preferredName 'nuxt-spedizionefacile-master' -markerFile 'nuxt.config.ts'

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

  if ($envContent -match '(?m)^SESSION_DRIVER=') {
    $envContent = [regex]::Replace($envContent, '(?m)^SESSION_DRIVER=.*$', 'SESSION_DRIVER=file')
  } else {
    $envContent += "`nSESSION_DRIVER=file"
  }

  if ($envContent -match '(?m)^QUEUE_CONNECTION=') {
    $envContent = [regex]::Replace($envContent, '(?m)^QUEUE_CONNECTION=.*$', 'QUEUE_CONNECTION=sync')
  } else {
    $envContent += "`nQUEUE_CONNECTION=sync"
  }

  if ($envContent -match '(?m)^MAIL_MAILER=') {
    $envContent = [regex]::Replace($envContent, '(?m)^MAIL_MAILER=.*$', 'MAIL_MAILER=log')
  } else {
    $envContent += "`nMAIL_MAILER=log"
  }

  if ($envContent -match '(?m)^APP_FRONTEND_URL=') {
    $envContent = [regex]::Replace($envContent, '(?m)^APP_FRONTEND_URL=.*$', 'APP_FRONTEND_URL=http://127.0.0.1:8787')
  } else {
    $envContent += "`nAPP_FRONTEND_URL=http://127.0.0.1:8787"
  }

  Set-Content -Path $envFile -Value $envContent -NoNewline

  Push-Location $laravelDir
  php artisan key:generate --force | Out-Null
  try { php artisan migrate --force | Out-Null } catch {}
  try { php artisan db:seed --class=Database\Seeders\DatabaseSeeder --force | Out-Null } catch {}
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
Start-Process -FilePath powershell -ArgumentList '-NoProfile','-Command',"Set-Location '$nuxtDir'; npm run dev -- --host 0.0.0.0 --port 3001 *> $env:TEMP\\nuxt.log" -WindowStyle Minimized

if (Get-Command caddy -ErrorAction SilentlyContinue) {
  $caddyFile = Join-Path $root 'Caddyfile'
  if (-not (Test-Path $caddyFile)) { $caddyFile = Join-Path $root 'Caddyfile.example' }
  Start-Process -FilePath powershell -ArgumentList '-NoProfile','-Command',"Set-Location '$root'; caddy run --config '$caddyFile' *> $env:TEMP\\caddy.log" -WindowStyle Minimized
  Write-Output '✅ Apri: http://127.0.0.1:8787'
} else {
  Write-Output '⚠️ Caddy non trovato. Apri: http://127.0.0.1:3001 (Nuxt)'
}

Write-Output "ℹ️ Root progetto: $root"
Write-Output "ℹ️ Frontend dir: $nuxtDir"
Write-Output "ℹ️ Backend dir: $laravelDir"
Write-Output "ℹ️ Log: $env:TEMP\\nuxt.log, $env:TEMP\\laravel.log"
