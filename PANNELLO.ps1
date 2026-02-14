param([string]$Azione = "MENU")

$ErrorActionPreference = "Stop"
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$state   = Join-Path $root "_STATE.json"
$logDir  = Join-Path $root "_LOG"
$urlFile = Join-Path $root "URL_ONLINE.txt"

if(-not (Test-Path $logDir)){ New-Item -ItemType Directory -Path $logDir | Out-Null }

function T([string]$m,[string]$c="Cyan"){
  $ts=(Get-Date).ToString("HH:mm:ss")
  Write-Host "[$ts] $m" -ForegroundColor $c
}

function Read-KeyChoice([string]$prompt = "Scelta"){
  Write-Host -NoNewline ("${prompt}: ") -ForegroundColor Cyan
  $keyInfo = [System.Console]::ReadKey($true)
  $char = $keyInfo.KeyChar
  Write-Host $char -ForegroundColor White
  return ([string]$char).Trim()
}

function Save-State($obj){
  $json = $obj | ConvertTo-Json -Depth 30
  $enc  = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($state, $json, $enc)
}

function Load-State(){
  if(Test-Path $state){
    try { return (Get-Content $state -Raw | ConvertFrom-Json) } catch { return $null }
  }
  return $null
}

function Kill-PidTree([int]$procId){
  if($procId -le 0){ return }
  cmd /c "taskkill /PID $procId /T /F >nul 2>&1" | Out-Null
}

function Get-PidsByPort([int]$port){
  $pids = @{}
  try{
    $lines = netstat -ano | Select-String (":$port\s")
    foreach($l in $lines){
      $s = ($l.Line -replace "\s+"," ").Trim()
      if($s -match "\sLISTENING\s(\d+)$"){
        $id = [int]$matches[1]
        $pids["$id"] = $true
      }
    }
  } catch {}
  return @($pids.Keys | ForEach-Object { [int]$_ })
}

function Kill-ByPort([int]$port){
  foreach($id in (Get-PidsByPort $port)){ Kill-PidTree $id }
}

function Wait-Http([string]$url,[int]$timeoutSec=240){
  $start = Get-Date
  while((Get-Date) - $start -lt [TimeSpan]::FromSeconds($timeoutSec)){
    try{
      Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri $url | Out-Null
      return $true
    } catch {
      try{ if($_.Exception.Response){ return $true } } catch {}
    }
    Start-Sleep -Milliseconds 400
  }
  return $false
}

function Resolve-ProjectDir([string]$preferredName, [string[]]$markerFiles, [string]$projectLabel){
  $preferred = Join-Path $root $preferredName
  foreach($marker in $markerFiles){
    if(Test-Path (Join-Path $preferred $marker)){ return $preferred }
  }

  $dirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue
  $matches = @()
  foreach($d in $dirs){
    foreach($marker in $markerFiles){
      if(Test-Path (Join-Path $d.FullName $marker)){
        $matches += $d.FullName
        break
      }
    }
  }

  if($matches.Count -eq 1){ return $matches[0] }
  if($matches.Count -gt 1){
    $list = ($matches | ForEach-Object { " - $_" }) -join "`n"
    throw "Trovate piu cartelle candidate per ${projectLabel}. Rinomina o elimina i duplicati e lascia una sola cartella valida:`n$list"
  }

  throw "Non trovo la cartella ${projectLabel} (marker: $($markerFiles -join ', '))."
}

function Find-Frontend(){
  return Resolve-ProjectDir "nuxt-spedizionefacile-master" @("nuxt.config.ts","nuxt.config.js","nuxt.config.mjs") "Nuxt"
}

function Find-Backend(){
  return Resolve-ProjectDir "laravel-spedizionefacile-main" @("artisan") "Laravel"
}

function Has-Caddyfile(){ return (Test-Path (Join-Path $root "Caddyfile")) }
function Has-Caddy(){ return [bool](Get-Command caddy -ErrorAction SilentlyContinue) }

function Stop-All(){
  T "Chiusura totale (spedizionefacile)..." "Yellow"
  $s = Load-State
  if($s){
    if($s.frontend){ Kill-PidTree ([int]$s.frontend) }
    if($s.backend){ Kill-PidTree ([int]$s.backend) }
    if($s.caddy){ Kill-PidTree ([int]$s.caddy) }
    if($s.cloudflared){ Kill-PidTree ([int]$s.cloudflared) }
  }

  # sicurezza porte tipiche (non invade BianchiPro)
  Kill-ByPort 8787
  Kill-ByPort 3001
  Kill-ByPort 8000

  Remove-Item $state -Force -ErrorAction SilentlyContinue | Out-Null
  T "Tutto chiuso." "Green"
}

function Ensure-NpmInstall([string]$dir){
  if(-not (Test-Path (Join-Path $dir "package.json"))){
    throw "In $dir non trovo package.json: Nuxt non sembra valido."
  }
  if(-not (Test-Path (Join-Path $dir "node_modules"))){
    T "Manca node_modules (Nuxt): npm install..." "Yellow"
    $o = Join-Path $logDir "nuxt_npm_out.log"
    $e = Join-Path $logDir "nuxt_npm_err.log"
    Remove-Item $o,$e -Force -ErrorAction SilentlyContinue | Out-Null
    $p = Start-Process -FilePath "cmd.exe" -WorkingDirectory $dir -PassThru -WindowStyle Hidden `
      -ArgumentList "/c","npm install" -RedirectStandardOutput $o -RedirectStandardError $e
    $p.WaitForExit()
    if($p.ExitCode -ne 0){ T "ERRORE npm install Nuxt. Log: $e" "Red"; throw "npm install Nuxt fallito" }
    T "npm install Nuxt completato." "Green"
  }
}


function Set-Or-AddEnvKey([string]$envPath,[string]$key,[string]$value){
  $content = ''
  if(Test-Path $envPath){ $content = Get-Content $envPath -Raw }
  if($content -match "(?m)^$key="){
    $content = [regex]::Replace($content, "(?m)^$key=.*$", "$key=$value")
  } else {
    if($content.Length -gt 0 -and -not $content.EndsWith("`n")){ $content += "`n" }
    $content += "$key=$value`n"
  }
  Set-Content -Path $envPath -Value $content -NoNewline
}

function Normalize-LaravelEnv([string]$backDir){
  $envFile = Join-Path $backDir '.env'
  $envExample = Join-Path $backDir '.env.example'
  if(-not (Test-Path $envFile) -and (Test-Path $envExample)){
    Copy-Item $envExample $envFile -Force
  }

  $dbPath = Join-Path $backDir 'database\database.sqlite'
  if(-not (Test-Path $dbPath)){ New-Item -ItemType File -Path $dbPath -Force | Out-Null }

  Set-Or-AddEnvKey $envFile 'DB_CONNECTION' 'sqlite'
  Set-Or-AddEnvKey $envFile 'DB_DATABASE' $dbPath
  Set-Or-AddEnvKey $envFile 'SESSION_DRIVER' 'file'
  Set-Or-AddEnvKey $envFile 'QUEUE_CONNECTION' 'sync'
  Set-Or-AddEnvKey $envFile 'CACHE_STORE' 'file'
  Set-Or-AddEnvKey $envFile 'APP_FRONTEND_URL' 'http://127.0.0.1:8787'

  if(Test-Path (Join-Path $backDir 'artisan')){
    $keyOut = Join-Path $logDir 'keygen_out.log'
    $keyErr = Join-Path $logDir 'keygen_err.log'
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backDir -WindowStyle Hidden -Wait `
      -ArgumentList '/c','php artisan key:generate --force' -RedirectStandardOutput $keyOut -RedirectStandardError $keyErr | Out-Null

    $migOut = Join-Path $logDir 'migrate_out.log'
    $migErr = Join-Path $logDir 'migrate_err.log'
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backDir -WindowStyle Hidden -Wait `
      -ArgumentList '/c','php artisan migrate --force' -RedirectStandardOutput $migOut -RedirectStandardError $migErr | Out-Null

    $seedOut = Join-Path $logDir 'seed_out.log'
    $seedErr = Join-Path $logDir 'seed_err.log'
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backDir -WindowStyle Hidden -Wait `
      -ArgumentList '/c','php artisan db:seed --class=Database\Seeders\DatabaseSeeder --force' -RedirectStandardOutput $seedOut -RedirectStandardError $seedErr | Out-Null

    # Crea il symlink storage per rendere accessibili le immagini caricate (es. homepage)
    $storageLink = Join-Path $backDir 'public\storage'
    if(-not (Test-Path $storageLink)){
      $linkOut = Join-Path $logDir 'storagelink_out.log'
      $linkErr = Join-Path $logDir 'storagelink_err.log'
      Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backDir -WindowStyle Hidden -Wait `
        -ArgumentList '/c','php artisan storage:link' -RedirectStandardOutput $linkOut -RedirectStandardError $linkErr | Out-Null
    }
  }
}

function Ensure-ComposerInstall([string]$dir){
  if(-not (Test-Path (Join-Path $dir "artisan"))){
    throw "In $dir non trovo artisan: Laravel non sembra valido."
  }
  if(-not (Test-Path (Join-Path $dir "vendor"))){
    $cmd = Get-Command composer -ErrorAction SilentlyContinue
    if(-not $cmd){
      T "Manca vendor ma non trovo 'composer'. Installare Composer oppure farlo installare allo sviluppatore." "Red"
      throw "Composer assente"
    }
    T "Manca vendor (Laravel): composer install..." "Yellow"
    $o = Join-Path $logDir "composer_out.log"
    $e = Join-Path $logDir "composer_err.log"
    Remove-Item $o,$e -Force -ErrorAction SilentlyContinue | Out-Null
    $p = Start-Process -FilePath "cmd.exe" -WorkingDirectory $dir -PassThru -WindowStyle Hidden `
      -ArgumentList "/c","composer install" -RedirectStandardOutput $o -RedirectStandardError $e
    $p.WaitForExit()
    if($p.ExitCode -ne 0){ T "ERRORE composer install. Log: $e" "Red"; throw "composer install fallito" }
    T "composer install completato." "Green"
  }
}

function Start-Local([switch]$NonAprireBrowser){
  Stop-All

  $frontDir = Find-Frontend
  $backDir  = Find-Backend

  T "Frontend selezionato: $frontDir" "DarkCyan"
  T "Backend selezionato:  $backDir" "DarkCyan"

  # porte dedicate (se vuoi cambiarle, si cambia qui, ma NON tocca BianchiPro)
  $frontPort = 3001
  $backPort  = 8000
  $proxyPort = 8787

  Ensure-NpmInstall $frontDir
  Ensure-ComposerInstall $backDir
  Normalize-LaravelEnv $backDir

  # log
  $nuxtOut  = Join-Path $logDir "nuxt_out.log"
  $nuxtErr  = Join-Path $logDir "nuxt_err.log"
  $phpOut   = Join-Path $logDir "laravel_out.log"
  $phpErr   = Join-Path $logDir "laravel_err.log"
  $cadOut   = Join-Path $logDir "caddy_out.log"
  $cadErr   = Join-Path $logDir "caddy_err.log"

  Remove-Item $nuxtOut,$nuxtErr,$phpOut,$phpErr,$cadOut,$cadErr -Force -ErrorAction SilentlyContinue | Out-Null

  # Avvio Laravel
  T "Avvio Laravel: http://127.0.0.1:$backPort" "Cyan"
  $pBack = Start-Process -FilePath "cmd.exe" -WorkingDirectory $backDir -PassThru -WindowStyle Hidden `
    -ArgumentList "/c","php artisan serve --host 127.0.0.1 --port $backPort" `
    -RedirectStandardOutput $phpOut -RedirectStandardError $phpErr

  # Avvio Nuxt
  T "Avvio Nuxt: http://127.0.0.1:$frontPort" "Cyan"
  $pFront = Start-Process -FilePath "cmd.exe" -WorkingDirectory $frontDir -PassThru -WindowStyle Hidden `
    -ArgumentList "/c","npx nuxi dev --host 127.0.0.1 --port $frontPort" `
    -RedirectStandardOutput $nuxtOut -RedirectStandardError $nuxtErr

  # Avvio Caddy se possibile
  $pCaddy = 0
  $base   = "http://127.0.0.1:$frontPort"

  if(Has-Caddyfile){
    if(Has-Caddy){
      T "Avvio Caddy (proxy): http://127.0.0.1:$proxyPort" "Cyan"
      $p = Start-Process -FilePath "cmd.exe" -WorkingDirectory $root -PassThru -WindowStyle Hidden `
        -ArgumentList "/c","caddy run --config Caddyfile --adapter caddyfile" `
        -RedirectStandardOutput $cadOut -RedirectStandardError $cadErr
      $pCaddy = $p.Id
      $base   = "http://127.0.0.1:$proxyPort"
    } else {
      T "Caddyfile presente ma Caddy non trovato: uso Nuxt diretto." "Yellow"
    }
  } else {
    T "Caddyfile non presente: uso Nuxt diretto." "Yellow"
  }

  Save-State @{
    frontend   = $pFront.Id
    backend    = $pBack.Id
    caddy      = $pCaddy
    cloudflared= 0
    frontPort  = $frontPort
    backPort   = $backPort
    proxyPort  = $proxyPort
    base       = $base
  }

  # attese: prima Nuxt e Laravel, poi base finale
  T "Attendere avvio Nuxt..." "DarkCyan"
  [void](Wait-Http ("http://127.0.0.1:$frontPort") 240)

  T "Attendere avvio Laravel..." "DarkCyan"
  [void](Wait-Http ("http://127.0.0.1:$backPort") 240)

  T "Attendere avvio base finale..." "DarkCyan"
  if(-not (Wait-Http $base 240)){
    T "ERRORE: base non risponde: $base" "Red"
    throw "Base non risponde"
  }

  T "PRONTO (locale): $base" "Green"
  if(-not $NonAprireBrowser){ Start-Process $base | Out-Null }
}

function Get-CloudflaredPath(){
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if($cmd){ return $cmd.Source }

  $p1 = Join-Path $env:ProgramFiles "Cloudflare\Cloudflared\cloudflared.exe"
  $p2 = Join-Path ${env:ProgramFiles(x86)} "Cloudflare\Cloudflared\cloudflared.exe"
  if(Test-Path $p1){ return $p1 }
  if(Test-Path $p2){ return $p2 }

  throw "cloudflared non trovato. Installare Cloudflare Tunnel."
}

function Share-Online(){
  Start-Local -NonAprireBrowser

  $s = Load-State
  $base = $s.base
  if(-not $base){ $base = "http://127.0.0.1:8787" }

  $cf = Get-CloudflaredPath

  $out = Join-Path $logDir "cloudflared_out.log"
  $err = Join-Path $logDir "cloudflared_err.log"
  Remove-Item $out,$err -Force -ErrorAction SilentlyContinue | Out-Null

  # Quick Tunnel Cloudflare (trycloudflare) :contentReference[oaicite:2]{index=2}
  $cfDir = Join-Path $env:USERPROFILE ".cloudflared"
  $bak = @()
  try{
    foreach($name in @("config.yml","config.yaml")){
      $p = Join-Path $cfDir $name
      if(Test-Path $p){
        $b = "$p.bak_" + (Get-Date).ToString("yyyyMMdd_HHmmss")
        Move-Item $p $b -Force
        $bak += @(@($p,$b))
      }
    }

    T "Avvio link pubblico (Cloudflare) verso $base" "Cyan"
    $pTun = Start-Process -FilePath $cf -WorkingDirectory $root -PassThru -WindowStyle Hidden `
      -ArgumentList @("tunnel","--url",$base) `
      -RedirectStandardOutput $out -RedirectStandardError $err

    $s.cloudflared = $pTun.Id
    Save-State $s

    $pattern = 'https://[^\s"]+\.trycloudflare\.com'
    $pub = $null
    $start = Get-Date
    while(-not $pub -and ((Get-Date)-$start).TotalSeconds -lt 120){
      $txt = ""
      if(Test-Path $out){ $txt += (Get-Content $out -Raw) }
      if(Test-Path $err){ $txt += "`n" + (Get-Content $err -Raw) }
      if($txt -match $pattern){ $pub = $matches[0] }
      Start-Sleep -Milliseconds 400
    }
    if(-not $pub){
      T "ERRORE: non trovo il link pubblico. Vedi log cloudflared." "Red"
      throw "Link pubblico non trovato"
    }

    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($urlFile, $pub, $enc)

    T "PRONTO (online): $pub" "Green"
    T "Link salvato in: $urlFile" "DarkGreen"

    [void](Wait-Http $pub 120)
    Start-Process $pub | Out-Null

  } finally {
    foreach($pair in $bak){
      $orig = $pair[0]; $backup = $pair[1]
      if(Test-Path $backup){ Move-Item $backup $orig -Force }
    }
  }
}

function Open-Local(){
  $s = Load-State
  $base = "http://127.0.0.1:8787"
  if($s -and $s.base){ $base = $s.base }
  Start-Process $base | Out-Null
}

function Open-Online(){
  if(Test-Path $urlFile){
    $u = (Get-Content $urlFile -Raw).Trim()
    if($u){ Start-Process $u | Out-Null; return }
  }
  T "Non trovo URL_ONLINE.txt (prima fare 'Condividi online')." "Yellow"
}

function Tail-Log(){
  T "Scegli log: 1=Nuxt OUT | 2=Nuxt ERR | 3=Laravel OUT | 4=Laravel ERR | 5=Caddy OUT | 6=Caddy ERR | 7=Cloudflared OUT | 8=Cloudflared ERR" "Yellow"
  $c = Read-KeyChoice "Log"
  if($c -eq $null){ $c = "" }
  $c = $c.Trim()

  $map = @{
    "1" = (Join-Path $logDir "nuxt_out.log")
    "2" = (Join-Path $logDir "nuxt_err.log")
    "3" = (Join-Path $logDir "laravel_out.log")
    "4" = (Join-Path $logDir "laravel_err.log")
    "5" = (Join-Path $logDir "caddy_out.log")
    "6" = (Join-Path $logDir "caddy_err.log")
    "7" = (Join-Path $logDir "cloudflared_out.log")
    "8" = (Join-Path $logDir "cloudflared_err.log")
  }

  if(-not $map.ContainsKey($c)){
    T "Scelta non valida." "Yellow"
    return
  }

  $p = $map[$c]
  if(-not (Test-Path $p)){
    T "Log non trovato: $p" "Yellow"
    return
  }

  T "Apro log (Ctrl+C per tornare al menu)..." "Cyan"
  Get-Content -Path $p -Tail 200 -Wait
}

function Show-Status(){
  $s = Load-State
  Write-Host ""
  Write-Host "============================================" -ForegroundColor DarkCyan
  Write-Host "      SPEDIZIONEFACILE CONTROL PANEL       " -ForegroundColor Cyan
  Write-Host "============================================" -ForegroundColor DarkCyan
  Write-Host "Cartella: $root" -ForegroundColor DarkGray

  $base = "http://127.0.0.1:8787"
  if($s -and $s.base){ $base = $s.base }
  Write-Host "Locale : $base" -ForegroundColor Cyan

  if(Test-Path $urlFile){
    $u = (Get-Content $urlFile -Raw).Trim()
    if($u){ Write-Host "Online : $u" -ForegroundColor Green }
  } else {
    Write-Host "Online : (non attivo)" -ForegroundColor DarkGray
  }

  if($s){
    Write-Host "PID Nuxt      : $($s.frontend)" -ForegroundColor DarkGray
    Write-Host "PID Laravel   : $($s.backend)" -ForegroundColor DarkGray
    Write-Host "PID Caddy     : $($s.caddy)" -ForegroundColor DarkGray
    Write-Host "PID Cloudflared: $($s.cloudflared)" -ForegroundColor DarkGray
  } else {
    Write-Host "Stato: (nessuno)" -ForegroundColor DarkGray
  }

  Write-Host "--------------------------------------------" -ForegroundColor DarkCyan
  Write-Host "Legenda colori menu: [Verde=Avvio] [Cyan=Online] [Rosso=Stop] [Magenta=Apri] [Giallo=Log]" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "1 = Avvia locale" -ForegroundColor Green
  Write-Host "2 = Condividi online (link pubblico)" -ForegroundColor Cyan
  Write-Host "3 = Chiudi tutto" -ForegroundColor Red
  Write-Host "4 = Apri locale nel browser" -ForegroundColor Magenta
  Write-Host "5 = Vedi log" -ForegroundColor Yellow
  Write-Host "Q = Esci" -ForegroundColor DarkGray
  Write-Host ""
}

function Menu(){
  while($true){
    Show-Status
    $k = (Read-KeyChoice "Menu").ToUpper()

    if($k -eq "1"){ Start-Local; continue }
    if($k -eq "2"){ Share-Online; continue }
    if($k -eq "3"){ Stop-All; continue }
    if($k -eq "4"){ Open-Local; continue }
    if($k -eq "5"){ Tail-Log; continue }
    if($k -eq "Q"){ break }

    T "Scelta non valida." "Yellow"
  }
}

# Azione diretta da .bat
$act = $Azione
if($act -eq $null){ $act = "MENU" }
$act = $act.Trim().ToUpper()

if($act -eq "AVVIA_LOCALE"){ Start-Local; Menu; exit }
if($act -eq "CONDIVIDI_ONLINE"){ Share-Online; Menu; exit }
if($act -eq "CHIUDI_TUTTO"){ Stop-All; Menu; exit }
if($act -eq "APRI_LOG"){ Tail-Log; Menu; exit }

Menu