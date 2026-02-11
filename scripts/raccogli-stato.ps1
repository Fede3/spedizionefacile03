$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
$reportDir = Join-Path $root 'tmp-diagnostica'
$reportFile = Join-Path $reportDir 'report.txt'

New-Item -ItemType Directory -Force $reportDir | Out-Null

$lines = @()
$lines += '=== DIAGNOSTICA TUTTOINSIEME (Windows) ==='
$lines += "Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += "Root: $root"
$lines += ''
$lines += '[1] Versioni strumenti'
$lines += "- php: $((php -v 2>$null | Select-Object -First 1) -join '')"
$lines += "- composer: $((composer --version 2>$null) -join '')"
$lines += "- node: $((node -v 2>$null) -join '')"
$lines += "- npm: $((npm -v 2>$null) -join '')"
$lines += "- cloudflared: $((cloudflared --version 2>$null | Select-Object -First 1) -join '')"
$lines += ''
$lines += '[2] Porte locali (3000/8000/8787)'
$lines += (netstat -ano | Select-String ':3000|:8000|:8787' | ForEach-Object { $_.Line })
$lines += ''
$lines += '[3] Endpoint locali'
$lines += "- 3000: $((curl.exe -I http://127.0.0.1:3000 2>$null | Select-Object -First 1) -join '')"
$lines += "- 8000: $((curl.exe -I http://127.0.0.1:8000 2>$null | Select-Object -First 1) -join '')"
$lines += "- 8787: $((curl.exe -I http://127.0.0.1:8787 2>$null | Select-Object -First 1) -join '')"
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
$lines += (git -C $root status -sb)

$lines | Out-File $reportFile -Encoding utf8
Write-Output "Report creato: $reportFile"
