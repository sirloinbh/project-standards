# Runs the shared local agent worker (agents/cli.mjs) for one target repository (#166).
# The queue, locks, worktrees and logs stay in <Root>\.local\agent-workflow, so repositories never mix.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File agents.ps1 [-Root <repository folder>] [status|doctor|start|stop|...]
# Keep this file ASCII-only: Windows PowerShell 5.1 reads a BOM-less script in the ANSI code page.
param(
    [ValidateSet('start', 'stop', 'status', 'doctor', 'smoke', 'enqueue', 'configure', 'diagnose', 'retry', 'accept-requirements', 'cancel', 'handoff-tests')]
    [string]$Action = 'status',
    [string]$Root = (Get-Location).Path,
    [int]$Issue = 0,
    [ValidateSet('code', 'documentation')][string]$TaskKind,
    [ValidateSet('review', 'highRiskReview')][string]$ReviewRole,
    [ValidateSet('simple', 'complex')][string]$TestComplexity,
    [ValidateSet('true', 'false')][string]$RequireDatabase,
    [ValidateSet('true', 'false')][string]$RequireBrowser,
    [ValidateSet('feat', 'fix', 'docs', 'chore')][string]$BranchType,
    [string]$Slug,
    [ValidateSet('planning', 'debugging', 'highRiskReview', 'tests', 'implementation', 'review', 'research', 'documentation')][string]$Role
)
$ErrorActionPreference = 'Stop'
if (($TaskKind -or $ReviewRole -or $TestComplexity -or $RequireDatabase -or $RequireBrowser) -and $Action -notin @('enqueue', 'configure')) { throw 'Routing options require enqueue or configure.' }
if (($BranchType -or $Slug) -and $Action -ne 'enqueue') { throw '-BranchType and -Slug require enqueue.' }
if ($Role -and $Action -ne 'smoke') { throw '-Role requires smoke.' }

# Validate the target before creating anything inside it.
if (-not (Test-Path -LiteralPath $Root -PathType Container)) { throw "Repository folder not found: $Root" }
$projectRoot = (Resolve-Path -LiteralPath $Root).ProviderPath.TrimEnd('\', '/')
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.git'))) { throw "Not a Git repository root: $projectRoot" }
$localRoot = Join-Path $projectRoot '.local/agent-workflow'
$cliPath = Join-Path $PSScriptRoot 'agents/cli.mjs'
if (-not (Test-Path -LiteralPath $cliPath)) { throw "Agent worker not found: $cliPath" }

# versions.json sits next to this script when installed and one folder up in the project-standards checkout.
$expectedNode = $null
foreach ($candidate in @((Join-Path $PSScriptRoot 'versions.json'), (Join-Path $PSScriptRoot '../versions.json'))) {
    if (Test-Path -LiteralPath $candidate) {
        $expectedNode = (Get-Content -LiteralPath $candidate -Raw | ConvertFrom-Json).node
        break
    }
}
# Warnings go to stderr so status output stays plain JSON.
# Prefer the repository's pinned Node (.local\node-v<version>-win-x64), then the Node on PATH.
$pinnedNode = if ($expectedNode) { Join-Path $projectRoot ".local/node-v$expectedNode-win-x64/node.exe" } else { $null }
$nodeExecutable = if ($pinnedNode -and (Test-Path -LiteralPath $pinnedNode)) { $pinnedNode } else { (Get-Command node.exe -ErrorAction Stop).Source }
if ($expectedNode) {
    $actualNode = (& $nodeExecutable --version).Trim().TrimStart('v')
    if ($actualNode -ne $expectedNode) { [Console]::Error.WriteLine("WARNING: Node $actualNode at $nodeExecutable differs from versions.json node $expectedNode.") }
} else {
    [Console]::Error.WriteLine('WARNING: versions.json not found next to the agent tools; Node version was not checked.')
}
# Same personal Codex home as project-terminal.ps1, unless the caller chose one.
if (-not $env:CODEX_HOME) { $env:CODEX_HOME = Join-Path $env:LOCALAPPDATA 'Codex-Account-B' }
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null

if ($Action -eq 'start') {
    & $nodeExecutable $cliPath --root $projectRoot doctor
    if ($LASTEXITCODE -ne 0) { throw 'Doctor failed; worker was not started.' }
    $lockPath = Join-Path $localRoot 'worker.lock'
    if (Test-Path -LiteralPath $lockPath) {
        $ownerPid = [int](Get-Content -LiteralPath $lockPath -Raw)
        if (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue) { throw "Worker already running (PID $ownerPid)." }
    }
    $stopPath = Join-Path $localRoot 'stop'
    if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath }
    # Start-Process joins arguments with spaces, so quote the paths ourselves.
    $workerArguments = @("`"$cliPath`"", '--root', "`"$projectRoot`"", 'work')
    $workerProcess = Start-Process -FilePath $nodeExecutable -ArgumentList $workerArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localRoot 'worker.stdout.log') -RedirectStandardError (Join-Path $localRoot 'worker.stderr.log')
    Write-Output "Worker launched for $projectRoot (PID $($workerProcess.Id)). Use agents.ps1 -Root <repository> status to inspect jobs."
    exit 0
}

$cliArguments = @('--root', $projectRoot, $Action)
if ($Action -in @('enqueue', 'configure', 'diagnose', 'retry', 'accept-requirements', 'cancel', 'handoff-tests')) {
    if ($Issue -lt 1) { throw '-Issue must be a positive GitHub issue number.' }
    $cliArguments += "$Issue"
    if ($TaskKind) { $cliArguments += @('--task-kind', $TaskKind) }
    if ($ReviewRole) { $cliArguments += @('--review-role', $ReviewRole) }
    if ($TestComplexity) { $cliArguments += @('--test-complexity', $TestComplexity) }
    if ($RequireDatabase) { $cliArguments += @('--require-database', $RequireDatabase) }
    if ($RequireBrowser) { $cliArguments += @('--require-browser', $RequireBrowser) }
    if ($BranchType) { $cliArguments += @('--branch-type', $BranchType) }
    if ($Slug) { $cliArguments += @('--slug', $Slug) }
} elseif ($Role) {
    $cliArguments += @('--role', $Role)
}
& $nodeExecutable $cliPath @cliArguments
exit $LASTEXITCODE
