param(
    [string]$ProjectRoot,
    [string]$BackupRoot
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Get-DefaultProjectRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
}

function Get-DefaultBackupRoot {
    return (Join-Path $env:USERPROFILE "Desktop\Documentazione importante\CLAUDE_RECOVERY")
}

function Get-ClaudeProjectKey {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $drive = $fullPath.Substring(0, 1)
    $rest = $fullPath.Substring(2).TrimStart("\")

    if ([string]::IsNullOrWhiteSpace($rest)) {
        return "$drive--"
    }

    return "$drive--" + ($rest -replace "[\\/]", "-")
}

function Get-ClaudeSessionRecord {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ClaudeHome,
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory = $true)]
        [string]$ProjectKey
    )

    $sessionsDir = Join-Path $ClaudeHome "sessions"
    $projectDir = Join-Path $ClaudeHome "projects\$ProjectKey"
    $records = @()

    if (Test-Path $sessionsDir) {
        foreach ($sessionFile in Get-ChildItem -LiteralPath $sessionsDir -Filter "*.json" | Sort-Object LastWriteTime -Descending) {
            try {
                $data = Get-Content -LiteralPath $sessionFile.FullName -Raw | ConvertFrom-Json
                if ($data.cwd -eq $ProjectRoot -and $data.sessionId) {
                    $records += [pscustomobject]@{
                        SessionId = [string]$data.sessionId
                        Source = "active-session"
                        SourceFile = $sessionFile.FullName
                        StartedAt = $data.startedAt
                        LastWriteTime = $sessionFile.LastWriteTime
                    }
                }
            } catch {
            }
        }
    }

    if ($records.Count -gt 0) {
        return $records | Sort-Object StartedAt, LastWriteTime -Descending | Select-Object -First 1
    }

    if (Test-Path $projectDir) {
        $latestLog = Get-ChildItem -LiteralPath $projectDir -Filter "*.jsonl" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            return [pscustomobject]@{
                SessionId = [System.IO.Path]::GetFileNameWithoutExtension($latestLog.Name)
                Source = "latest-project-log"
                SourceFile = $latestLog.FullName
                StartedAt = $null
                LastWriteTime = $latestLog.LastWriteTime
            }
        }
    }

    throw "Nessuna sessione Claude trovata per $ProjectRoot"
}

function Get-MessageText {
    param(
        [Parameter(ValueFromPipeline = $true)]
        [object]$Content
    )

    if ($null -eq $Content) {
        return ""
    }

    if ($Content -is [string]) {
        return $Content
    }

    if ($Content -is [System.Collections.IEnumerable] -and -not ($Content -is [string])) {
        $parts = foreach ($item in $Content) {
            $part = Get-MessageText -Content $item
            if (-not [string]::IsNullOrWhiteSpace($part)) {
                $part
            }
        }

        return ($parts -join "`r`n").Trim()
    }

    $propertyNames = @($Content.PSObject.Properties.Name)

    if ($propertyNames -contains "text" -and $null -ne $Content.text) {
        return [string]$Content.text
    }

    if ($propertyNames -contains "content" -and $null -ne $Content.content) {
        return Get-MessageText -Content $Content.content
    }

    if ($propertyNames -contains "type" -and $Content.type -eq "tool_use" -and $propertyNames -contains "name") {
        return "[tool_use] $($Content.name)"
    }

    if ($propertyNames -contains "type" -and $null -ne $Content.type) {
        return "[content:$($Content.type)]"
    }

    return ($Content | ConvertTo-Json -Depth 20 -Compress)
}

function Get-RecentRoleMessages {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SessionLogPath
    )

    $items = @()

    foreach ($line in Get-Content -LiteralPath $SessionLogPath -Tail 1200) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            $entry = $line | ConvertFrom-Json
        } catch {
            continue
        }

        if (-not $entry.message -or -not $entry.message.role) {
            continue
        }

        $role = [string]$entry.message.role
        if ($role -notin @("user", "assistant")) {
            continue
        }

        $text = Get-MessageText -Content $entry.message.content
        if ([string]::IsNullOrWhiteSpace($text)) {
            continue
        }

        $items += [pscustomobject]@{
            Role = $role
            Timestamp = [string]$entry.timestamp
            Text = $text.Trim()
        }
    }

    return $items
}

function Get-LastPromptText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SessionLogPath
    )

    $lastPrompt = ""

    foreach ($line in Get-Content -LiteralPath $SessionLogPath -Tail 1200) {
        if ($line -notmatch '"type":"last-prompt"') {
            continue
        }

        try {
            $entry = $line | ConvertFrom-Json
            if ($entry.lastPrompt) {
                $lastPrompt = [string]$entry.lastPrompt
            }
        } catch {
        }
    }

    return $lastPrompt
}

function Save-TextFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    Set-Content -LiteralPath $Path -Value $Lines -Encoding UTF8
}

function Save-GitOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,
        [Parameter(Mandatory = $true)]
        [string]$OutputPath,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $quotedArgs = @("-C", $ProjectRoot) + $Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }

    $argumentLine = ($quotedArgs -join " ")
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "git"
    $processInfo.Arguments = $argumentLine
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $null = $process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    $result = @()
    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
        $result += ($stdout -split "`r?`n")
    }
    if (-not [string]::IsNullOrWhiteSpace($stderr)) {
        $result += ($stderr -split "`r?`n")
    }

    $exitCode = $process.ExitCode

    if ($exitCode -ne 0) {
        $result = @($result) + "" + "git exit code: $exitCode"
    }

    Save-TextFile -Path $OutputPath -Lines @($result)
    return @($result)
}

if (-not $ProjectRoot) {
    $ProjectRoot = Get-DefaultProjectRoot
}

if (-not $BackupRoot) {
    $BackupRoot = Get-DefaultBackupRoot
}

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$ClaudeHome = Join-Path $env:USERPROFILE ".claude"
$ProjectKey = Get-ClaudeProjectKey -Path $ProjectRoot
$SessionRecord = Get-ClaudeSessionRecord -ClaudeHome $ClaudeHome -ProjectRoot $ProjectRoot -ProjectKey $ProjectKey
$SessionId = $SessionRecord.SessionId
$ProjectClaudeDir = Join-Path $ClaudeHome "projects\$ProjectKey"
$SessionLogPath = Join-Path $ProjectClaudeDir "$SessionId.jsonl"
$SessionFolderPath = Join-Path $ProjectClaudeDir $SessionId

if (-not (Test-Path $SessionLogPath)) {
    throw "Log sessione non trovato: $SessionLogPath"
}

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BundleName = "$Timestamp-$SessionId"
$BundleRoot = Join-Path $BackupRoot $BundleName
New-Item -ItemType Directory -Path $BundleRoot -Force | Out-Null

$ConversationDir = Join-Path $BundleRoot "conversation"
$GitDir = Join-Path $BundleRoot "git"
$WorkspaceDir = Join-Path $BundleRoot "workspace"
$ClaudeMetaDir = Join-Path $BundleRoot "claude-meta"
$LatestPointerPath = Join-Path $BackupRoot "LATEST_SESSION.json"

New-Item -ItemType Directory -Path $ConversationDir, $GitDir, $WorkspaceDir, $ClaudeMetaDir -Force | Out-Null

Copy-Item -LiteralPath $SessionLogPath -Destination (Join-Path $ConversationDir "session-main.jsonl") -Force

if (Test-Path $SessionFolderPath) {
    Copy-Item -LiteralPath $SessionFolderPath -Destination (Join-Path $ConversationDir "session-folder") -Recurse -Force
}

if (Test-Path (Join-Path $ClaudeHome "history.jsonl")) {
    Copy-Item -LiteralPath (Join-Path $ClaudeHome "history.jsonl") -Destination (Join-Path $ClaudeMetaDir "history.jsonl") -Force
}

foreach ($folderName in @("plans", "todos", "shell-snapshots", "file-history")) {
    $sourcePath = Join-Path $ClaudeHome $folderName
    if (Test-Path $sourcePath) {
        Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $ClaudeMetaDir $folderName) -Recurse -Force
    }
}

$recentMessages = Get-RecentRoleMessages -SessionLogPath $SessionLogPath
$lastPromptText = Get-LastPromptText -SessionLogPath $SessionLogPath
$lastUserMessage = $recentMessages | Where-Object { $_.Role -eq "user" } | Select-Object -Last 1
$lastAssistantMessage = $recentMessages | Where-Object { $_.Role -eq "assistant" } | Select-Object -Last 1

$lastUserText = if ($lastUserMessage) { $lastUserMessage.Text } else { "Nessun messaggio utente trovato nel tail del log." }
$lastAssistantText = if ($lastAssistantMessage) { $lastAssistantMessage.Text } else { "Nessun messaggio assistant trovato nel tail del log." }
$lastPromptText = if ([string]::IsNullOrWhiteSpace($lastPromptText)) { "Nessun lastPrompt trovato nel tail del log." } else { $lastPromptText.Trim() }

Save-TextFile -Path (Join-Path $ConversationDir "ultimo-messaggio-utente.txt") -Lines @($lastUserText)
Save-TextFile -Path (Join-Path $ConversationDir "ultimo-messaggio-assistant.txt") -Lines @($lastAssistantText)
Save-TextFile -Path (Join-Path $ConversationDir "ultimo-last-prompt.txt") -Lines @($lastPromptText)
Save-TextFile -Path (Join-Path $ConversationDir "session-tail.jsonl") -Lines @(Get-Content -LiteralPath $SessionLogPath -Tail 120)

$statusLines = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-status.txt") -Arguments @("--no-pager", "status", "--short")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-status-branch.txt") -Arguments @("--no-pager", "status", "--short", "--branch")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-diff-stat.txt") -Arguments @("--no-pager", "diff", "--stat")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-diff-name-status.txt") -Arguments @("--no-pager", "diff", "--name-status")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-diff.patch") -Arguments @("--no-pager", "diff", "--binary", "--no-ext-diff")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-diff-cached.patch") -Arguments @("--no-pager", "diff", "--cached", "--binary", "--no-ext-diff")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-untracked.txt") -Arguments @("--no-pager", "ls-files", "--others", "--exclude-standard")
$null = Save-GitOutput -ProjectRoot $ProjectRoot -OutputPath (Join-Path $GitDir "git-log-today.txt") -Arguments @("--no-pager", "log", "--since=midnight", "--decorate", "--oneline")

$todayStart = (Get-Date).Date
$todayFiles = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object {
        $_.LastWriteTime -ge $todayStart -and
        $_.FullName -notmatch "\\\.git\\" -and
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\vendor\\"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object FullName, Length, LastWriteTime

$todayFiles | Export-Csv -LiteralPath (Join-Path $WorkspaceDir "files-modified-today.csv") -NoTypeInformation -Encoding UTF8

$statusLines = @($statusLines | Where-Object { $_ -is [string] -and -not [string]::IsNullOrWhiteSpace($_) })
$untrackedCount = (@($statusLines | Where-Object { $_ -match '^\?\? ' })).Count
$trackedChangeCount = (@($statusLines | Where-Object { $_ -notmatch '^\?\? ' })).Count
$sessionLogInfo = Get-Item -LiteralPath $SessionLogPath

$resumeLines = @(
    "# Claude Recovery",
    "",
    "Session ID: $SessionId",
    "Project root: $ProjectRoot",
    "Bundle: $BundleRoot",
    "Session source: $($SessionRecord.Source)",
    "Session log last write: $($sessionLogInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))",
    "",
    "Resume commands:",
    "cd /d `"$ProjectRoot`" && claude -r $SessionId",
    "cd /d `"$ProjectRoot`" && claude -c",
    "",
    "Workspace summary:",
    "Tracked changes: $trackedChangeCount",
    "Untracked files: $untrackedCount",
    "Files modified today: $($todayFiles.Count)",
    "",
    "Last saved prompt:",
    $lastPromptText,
    "",
    "Last user message:",
    $lastUserText,
    "",
    "Last assistant message:",
    $lastAssistantText
)

Save-TextFile -Path (Join-Path $BundleRoot "RECOVERY_README.txt") -Lines $resumeLines

$latestPayload = [ordered]@{
    createdAt = (Get-Date).ToString("o")
    projectRoot = $ProjectRoot
    projectKey = $ProjectKey
    sessionId = $SessionId
    bundleRoot = $BundleRoot
    sessionLog = $SessionLogPath
    sessionSource = $SessionRecord.Source
    resumeCommand = "cd /d `"$ProjectRoot`" && claude -r $SessionId"
    fallbackCommand = "cd /d `"$ProjectRoot`" && claude -c"
    trackedChanges = $trackedChangeCount
    untrackedFiles = $untrackedCount
    filesModifiedToday = $todayFiles.Count
    lastPromptPath = (Join-Path $ConversationDir "ultimo-last-prompt.txt")
    lastUserMessagePath = (Join-Path $ConversationDir "ultimo-messaggio-utente.txt")
    lastAssistantMessagePath = (Join-Path $ConversationDir "ultimo-messaggio-assistant.txt")
    readmePath = (Join-Path $BundleRoot "RECOVERY_README.txt")
}

$latestPayload | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $LatestPointerPath -Encoding UTF8

Write-Output "Snapshot creato: $BundleRoot"
Write-Output "Session ID: $SessionId"
Write-Output "Resume: cd /d `"$ProjectRoot`" && claude -r $SessionId"
