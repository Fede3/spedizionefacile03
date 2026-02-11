$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendLog = Join-Path $env:TEMP 'cloudflared-backend.log'
$frontendLog = Join-Path $env:TEMP 'cloudflared-frontend.log'

function Get-TunnelUrl([string]$logFile) {
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Path $logFile) {
      $match = Select-String -Path $logFile -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -AllMatches | Select-Object -Last 1
      if ($match -and $match.Matches.Count -gt 0) {
        return $match.Matches[0].Value
      }
    }
    Start-Sleep -Seconds 1
  }
  return $null
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  throw 'cloudflared non trovato nel PATH.'
}

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'avvia-locale.ps1') | Out-Null

if (Test-Path $backendLog) { Remove-Item $backendLog -Force }
if (Test-Path $frontendLog) { Remove-Item $frontendLog -Force }

Start-Process -FilePath cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:8000','--no-autoupdate' -RedirectStandardOutput $backendLog -RedirectStandardError $backendLog -WindowStyle Minimized
$backendUrl = Get-TunnelUrl $backendLog
if (-not $backendUrl) { throw "Tunnel backend non disponibile. Log: $backendLog" }

$env:NUXT_PUBLIC_API_BASE = $backendUrl
Start-Process -FilePath powershell -ArgumentList '-NoProfile','-Command',"Set-Location '$root\\nuxt-spedizionefacile-master'; npm run dev -- --host 0.0.0.0 --port 3000 *> $env:TEMP\\nuxt.log" -WindowStyle Minimized
Start-Sleep -Seconds 2

Start-Process -FilePath cloudflared -ArgumentList 'tunnel','--url','http://127.0.0.1:3000','--no-autoupdate' -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendLog -WindowStyle Minimized
$frontendUrl = Get-TunnelUrl $frontendLog
if (-not $frontendUrl) { throw "Tunnel frontend non disponibile. Log: $frontendLog" }

Write-Output "✅ Frontend pubblico: $frontendUrl"
Write-Output "✅ Backend pubblico:  $backendUrl"
