$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$reportDir = Join-Path $root 'tmp-diagnostica'
$reportFile = Join-Path $reportDir 'report.txt'

function Resolve-Executable([string[]]$candidates) {
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }

    if ($candidate -match '[\\/]') {
      if (Test-Path $candidate) { return $candidate }
      continue
    }

    $command = Get-Command $candidate -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
  }

  return $null
}

function Invoke-FirstLine([string]$commandPath, [string[]]$arguments) {
  if (-not $commandPath) { return 'non trovato' }
  try {
    $output = & $commandPath @arguments 2>$null
    if (-not $output) { return '' }
    return (($output | Select-Object -First 1) -join '')
  } catch {
    return ''
  }
}

$phpCmd = Resolve-Executable @(
  'C:\Users\Feder\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe',
  'php.exe',
  'php'
)
$composerCmd = Resolve-Executable @(
  'C:\composer\composer.bat',
  'composer.bat',
  'composer'
)
$nodeCmd = Resolve-Executable @(
  'C:\Program Files\nodejs\node.exe',
  'node.exe',
  'node'
)
$npmCmd = Resolve-Executable @(
  'C:\Program Files\nodejs\npm.cmd',
  'npm.cmd',
  'npm'
)
$cloudflaredCmd = Resolve-Executable @(
  'C:\Program Files (x86)\cloudflared\cloudflared.exe',
  'cloudflared.exe',
  'cloudflared'
)
$gitCmd = Resolve-Executable @(
  'C:\Program Files\Git\cmd\git.exe',
  'git.exe',
  'git'
)
$netstatCmd = Join-Path $env:SystemRoot 'System32\netstat.exe'
$curlCmd = Join-Path $env:SystemRoot 'System32\curl.exe'

New-Item -ItemType Directory -Force $reportDir | Out-Null

$lines = @()
$lines += '=== DIAGNOSTICA SPEDIZIONEFACILE (Windows) ==='
$lines += "Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += "Root: $root"
$lines += ''
$lines += '[1] Versioni strumenti'
$lines += "- php: $(Invoke-FirstLine $phpCmd @('-v'))"
$lines += "- composer: $(Invoke-FirstLine $composerCmd @('--version'))"
$lines += "- node: $(Invoke-FirstLine $nodeCmd @('-v'))"
$lines += "- npm: $(Invoke-FirstLine $npmCmd @('-v'))"
$lines += "- cloudflared: $(Invoke-FirstLine $cloudflaredCmd @('--version'))"
$lines += ''
$lines += '[2] Porte locali (3001/8000/8787)'
$portLines = & cmd.exe /c 'netstat -ano' 2>$null | Select-String ':3001|:8000|:8787' | ForEach-Object { $_.Line }
$lines += $portLines
$lines += ''
$lines += '[3] Endpoint locali'
$lines += "- 3001: $(Invoke-FirstLine $curlCmd @('-I', 'http://127.0.0.1:3001'))"
$lines += "- 8000: $(Invoke-FirstLine $curlCmd @('-I', 'http://127.0.0.1:8000'))"
$lines += "- 8787: $(Invoke-FirstLine $curlCmd @('-I', 'http://127.0.0.1:8787'))"
$lines += ''
$lines += '[4] URL tunnel rilevati'
if (Test-Path (Join-Path $env:TEMP 'cloudflared-frontend.log')) {
  $lines += (Select-String -Path (Join-Path $env:TEMP 'cloudflared-frontend.log') -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | ForEach-Object { $_.Matches.Value } | Select-Object -Unique)
}
if (Test-Path (Join-Path $env:TEMP 'cloudflared-backend.log')) {
  $lines += (Select-String -Path (Join-Path $env:TEMP 'cloudflared-backend.log') -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | ForEach-Object { $_.Matches.Value } | Select-Object -Unique)
}
$lines += ''
$lines += '[5] Repo stato'
$repoStatus = if ($gitCmd) { & $gitCmd -C $root status -sb } else { 'git non trovato' }
$lines += $repoStatus

$lines | Out-File $reportFile -Encoding utf8
Write-Output "Report creato: $reportFile"
