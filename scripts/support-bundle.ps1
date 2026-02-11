$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$outDir = Join-Path $root "support_bundle_$ts"
$zip = Join-Path $root "support_bundle_$ts.zip"

New-Item -ItemType Directory -Force $outDir | Out-Null

"=== VERSIONS ===" | Out-File "$outDir\versions.txt" -Encoding utf8
php -v 2>&1 | Out-File "$outDir\versions.txt" -Append -Encoding utf8
composer --version 2>&1 | Out-File "$outDir\versions.txt" -Append -Encoding utf8
node -v 2>&1 | Out-File "$outDir\versions.txt" -Append -Encoding utf8
npm -v 2>&1 | Out-File "$outDir\versions.txt" -Append -Encoding utf8
cloudflared --version 2>&1 | Out-File "$outDir\versions.txt" -Append -Encoding utf8

netstat -ano | Out-File "$outDir\netstat.txt" -Encoding utf8

curl.exe -I http://127.0.0.1:8787 2>&1 | Out-File "$outDir\curl_8787.txt" -Encoding utf8
curl.exe -I http://127.0.0.1:8787/sanctum/csrf-cookie 2>&1 | Out-File "$outDir\curl_csrf.txt" -Encoding utf8
curl.exe -i -H "Accept: application/json" http://127.0.0.1:8787/api/user 2>&1 | Out-File "$outDir\curl_api_user.txt" -Encoding utf8

$filesToCopy = @(
    (Join-Path $root 'README.md'),
    (Join-Path $root 'Caddyfile'),
    (Join-Path $root 'Caddyfile.example'),
    (Join-Path $root 'nuxt-spedizionefacile-master\nuxt.config.ts'),
    (Join-Path $root 'nuxt-spedizionefacile-master\.env.example'),
    (Join-Path $root 'laravel-spedizionefacile-main\.env.example'),
    (Join-Path $root 'laravel-spedizionefacile-main\routes\web.php'),
    (Join-Path $root 'laravel-spedizionefacile-main\routes\api.php'),
    (Join-Path $env:TEMP 'nuxt.log'),
    (Join-Path $env:TEMP 'laravel.log'),
    (Join-Path $env:TEMP 'caddy.log'),
    (Join-Path $env:TEMP 'cloudflared-backend.log'),
    (Join-Path $env:TEMP 'cloudflared-frontend.log')
)

foreach ($path in $filesToCopy) {
    if (Test-Path $path) {
        Copy-Item $path (Join-Path $outDir (Split-Path $path -Leaf)) -Force
    }
}

if (Test-Path $zip) {
    Remove-Item $zip -Force
}
Compress-Archive -Path "$outDir\*" -DestinationPath $zip -Force
Write-Output "OK: creato $zip"
