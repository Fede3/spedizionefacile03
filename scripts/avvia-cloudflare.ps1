$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$urlOnlineFile = Join-Path $root 'URL_ONLINE.txt'
$backendLog = Join-Path $env:TEMP 'cloudflared-backend.log'
$frontendLog = Join-Path $env:TEMP 'cloudflared-frontend.log'
$exposeBackendTunnel = $env:EXPOSE_BACKEND_TUNNEL -eq '1'

function Resolve-Executable([string]$label, [string[]]$candidates, [switch]$Optional) {
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }

    if ($candidate -match '[\\/]') {
      if (Test-Path $candidate) { return $candidate }
      continue
    }

    $command = Get-Command $candidate -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
  }

  if ($Optional) { return $null }
  throw "$label non trovato nel PATH o nei percorsi noti."
}

function Test-TcpEndpoint([string]$targetHost, [int]$port) {
  $client = $null
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($targetHost, $port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(1500, $false)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    if ($client) {
      try { $client.Close() } catch {}
    }
  }
}

function Resolve-ReachableProxyTarget([int]$port, [string[]]$hosts) {
  foreach ($targetHost in ($hosts | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-TcpEndpoint -targetHost $targetHost -port $port) {
      return "http://${targetHost}:$port"
    }
  }

  return "http://127.0.0.1:$port"
}

function Get-TunnelUrl([string[]]$logFiles) {
  for ($i = 0; $i -lt 60; $i++) {
    foreach ($logFile in $logFiles) {
      if (-not (Test-Path $logFile)) { continue }
      $match = Select-String -Path $logFile -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -AllMatches | Select-Object -Last 1
      if ($match -and $match.Matches.Count -gt 0) {
        return $match.Matches[0].Value
      }
    }
    Start-Sleep -Seconds 1
  }
  return $null
}

function Test-PreviewUrlHealthy([string]$baseUrl) {
  $normalizedUrl = $baseUrl.TrimEnd('/')
  $paths = @(
    $normalizedUrl,
    "$normalizedUrl/api/public/price-bands"
  )

  foreach ($path in $paths) {
    try {
      $response = Invoke-WebRequest -Uri $path -Method Head -UseBasicParsing -TimeoutSec 10
      $statusCode = [int]$response.StatusCode
      if ($statusCode -lt 200 -or $statusCode -ge 500 -or $statusCode -eq 530) {
        return $false
      }
    } catch {
      $statusCode = $null
      if ($_.Exception.Response) {
        try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
      }

      if (-not $statusCode -or $statusCode -lt 200 -or $statusCode -ge 500 -or $statusCode -eq 530) {
        return $false
      }
    }
  }

  return $true
}

function Wait-TunnelReachable([string]$url) {
  for ($i = 0; $i -lt 45; $i++) {
    if (Test-PreviewUrlHealthy $url) { return $true }

    Start-Sleep -Seconds 2
  }

  return $false
}

function Test-TunnelProcessAlive($process) {
  if (-not $process) { return $false }
  try {
    return -not $process.HasExited
  } catch {
    return $false
  }
}

function Get-TunnelFailureMessage([string]$label, [string]$logFile) {
  if (Test-Path $logFile) {
    $logContent = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($logContent -match '1015|429 Too Many Requests') {
      return "Tunnel $label non creato: Cloudflare Quick Tunnel e' in rate limit (1015/429). Attendi il cooldown oppure usa un named tunnel. Log: $logFile"
    }
    if ($logContent -match '530|1033') {
      return "Tunnel $label creato ma non propagato o non raggiungibile (530/1033). Controlla il backend locale e riprova. Log: $logFile"
    }
  }

  return "Tunnel $label non disponibile. Log: $logFile"
}

function Remove-LogIfPossible([string]$path) {
  if (-not (Test-Path $path)) { return }
  try {
    Remove-Item $path -Force
  } catch {
    Start-Sleep -Milliseconds 250
  }
}

$cloudflaredCmd = Resolve-Executable 'cloudflared' @(
  'C:\Program Files (x86)\cloudflared\cloudflared.exe',
  'cloudflared.exe',
  'cloudflared'
)
$powershellCmd = Resolve-Executable 'PowerShell' @(
  (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'),
  'powershell.exe',
  'powershell'
)

$env:CADDYFILE_OVERRIDE = Join-Path $root 'Caddyfile.trycloudflare'
$null = & $powershellCmd -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'avvia-locale.ps1')
Remove-Item Env:CADDYFILE_OVERRIDE -ErrorAction SilentlyContinue

$hostCandidates = @()
if ($env:WSL_HOST_GATEWAY) {
  $hostCandidates += $env:WSL_HOST_GATEWAY
}

try {
  $hostCandidates += Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -and $_.IPAddress -notmatch '^(127|169\.254)\.' } |
    Select-Object -ExpandProperty IPAddress
} catch {}

$hostCandidates += @('localhost', '127.0.0.1')
$frontendTarget = Resolve-ReachableProxyTarget -port 8787 -hosts $hostCandidates
$backendTarget = Resolve-ReachableProxyTarget -port 8000 -hosts $hostCandidates

Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Remove-LogIfPossible $backendLog
Remove-LogIfPossible $frontendLog

try {
  # Il tunnel frontend deve passare da Caddy su 8787: cosi' pubblico e API
  # condividono la stessa origine e il plugin sanctum-dynamic-url non spezza
  # login, CSRF e fetch client-side sulla preview remota.
  $frontendProcess = Start-Process -FilePath $cloudflaredCmd -ArgumentList 'tunnel','--url',$frontendTarget,'--no-autoupdate','--logfile',$frontendLog -WindowStyle Minimized -PassThru
  $frontendUrl = Get-TunnelUrl @($frontendLog)
  if (-not $frontendUrl) { throw (Get-TunnelFailureMessage 'frontend' $frontendLog) }
  if (-not (Test-TunnelProcessAlive $frontendProcess)) { throw (Get-TunnelFailureMessage 'frontend' $frontendLog) }
  if (-not (Wait-TunnelReachable $frontendUrl)) { throw "Tunnel frontend creato ma non ancora raggiungibile o non propagato correttamente. Log: $frontendLog" }

  $backendUrl = $null
  if ($exposeBackendTunnel) {
    $backendProcess = Start-Process -FilePath $cloudflaredCmd -ArgumentList 'tunnel','--url',$backendTarget,'--no-autoupdate','--logfile',$backendLog -WindowStyle Minimized -PassThru
    $backendUrl = Get-TunnelUrl @($backendLog)
    if (-not $backendUrl -or -not (Test-TunnelProcessAlive $backendProcess) -or -not (Wait-TunnelReachable $backendUrl)) {
      Write-Warning "Backend pubblico opzionale non certificato. La preview principale resta: $frontendUrl"
      $backendUrl = $null
    }
  }

  Set-Content -Path $urlOnlineFile -Value $frontendUrl -NoNewline

  Write-Output "Root progetto: $root"
  Write-Output "Frontend pubblico (origine unica via Caddy): $frontendUrl"
  Write-Output "Frontend origin tunnel -> $frontendTarget"
  if ($backendUrl) {
    Write-Output "Backend pubblico opzionale: $backendUrl"
    Write-Output "Backend origin tunnel -> $backendTarget"
  }
  Write-Output "URL_ONLINE aggiornato: $urlOnlineFile"
} catch {
  throw
}
