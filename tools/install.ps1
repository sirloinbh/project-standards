# Installs the personal account tools into one folder shared by every sirloinbh project.
# It never deletes or changes the previous location (%LOCALAPPDATA%\gh-workout-memo).
# It also updates this PC's global agent instructions, which live outside every repository (#365).
# A custom -Destination without -UserHome leaves them alone, so a test install never edits the real ones.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1 [-Destination <folder>] [-UserHome <folder>]
param(
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'sirloinbh-tools'),
    [string]$UserHome
)
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
# Target name (relative to Destination) -> source file. The agent worker (#166) needs its
# launcher, its modules, the project registry (allowed repositories) and versions.json (Node version).
$files = [ordered]@{}
foreach ($name in @('gh-project.ps1', 'project-terminal.ps1', 'open-vscode-account-b.cmd', 'set-credential-helper.ps1', 'agents.ps1')) {
    $files[$name] = Join-Path $PSScriptRoot $name
}
foreach ($module in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'agents') -Filter '*.mjs' -File | Sort-Object Name) {
    $files["agents\$($module.Name)"] = $module.FullName
}
$files['registry\projects.json'] = Join-Path $repositoryRoot 'registry\projects.json'
$files['versions.json'] = Join-Path $repositoryRoot 'versions.json'

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($name in $files.Keys) {
    $source = $files[$name]
    $target = Join-Path $Destination $name
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    if (Test-Path -LiteralPath $target) {
        if ((Get-FileHash -LiteralPath $source).Hash -eq (Get-FileHash -LiteralPath $target).Hash) {
            Write-Output "unchanged  $name"
            continue
        }
        # Keep the replaced copy so a bad update can be rolled back by hand.
        Copy-Item -LiteralPath $target "$target.bak-$stamp"
        Write-Output "backed up  $name -> $(Split-Path $name -Leaf).bak-$stamp"
    }
    Copy-Item -LiteralPath $source $target
    Write-Output "installed  $name"
}

if (-not $UserHome -and -not $PSBoundParameters.ContainsKey('Destination')) { $UserHome = $env:USERPROFILE }
if ($UserHome) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $section = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'global-instructions\git-branches.md')).Replace("`r`n", "`n").Trim() + "`n"
    # A missing file has no rule to conflict with: the repositories carry the same rule.
    $instructions = @(
        (Join-Path $UserHome '.claude\CLAUDE.md'),
        (Join-Path $UserHome '.codex\AGENTS.md'),
        (Join-Path $env:LOCALAPPDATA 'Codex-Account-B\AGENTS.md')
    )
    foreach ($path in $instructions) {
        if (-not (Test-Path -LiteralPath $path)) {
            Write-Output "no file    $path"
            continue
        }
        $current = [IO.File]::ReadAllText($path).Replace("`r`n", "`n")
        # Replaces the old Fork section or an earlier copy of this one, up to the next section.
        $match = [regex]::Match($current, '(?ms)^## [^\n]*(Fork|git CLI)[^\n]*\n.*?(?=^## |\z)')
        if ($match.Success) {
            $after = $current.Substring($match.Index + $match.Length)
            $updated = $current.Substring(0, $match.Index) + $section + $(if ($after) { "`n$after" } else { '' })
        } else {
            $updated = $current.TrimEnd() + "`n`n" + $section
        }
        if ($updated -ceq $current) {
            Write-Output "unchanged  $path"
            continue
        }
        Copy-Item -LiteralPath $path "$path.bak-$stamp"
        [IO.File]::WriteAllText($path, $updated, $utf8)
        Write-Output "updated    $path (backup .bak-$stamp)"
    }
    # The memory that says branches are managed in the Fork app contradicts the rule above.
    $projects = Join-Path $UserHome '.claude\projects'
    if (Test-Path -LiteralPath $projects) {
        foreach ($project in Get-ChildItem -LiteralPath $projects -Directory) {
            $memory = Join-Path $project.FullName 'memory\fork-branch-management.md'
            if (-not (Test-Path -LiteralPath $memory)) { continue }
            Move-Item -LiteralPath $memory "$memory.bak-$stamp"
            $index = Join-Path $project.FullName 'memory\MEMORY.md'
            if (Test-Path -LiteralPath $index) {
                $lines = [IO.File]::ReadAllLines($index) | Where-Object { $_ -notmatch 'fork-branch-management\.md' }
                [IO.File]::WriteAllLines($index, [string[]]@($lines), $utf8)
            }
            Write-Output "retired    $memory (backup .bak-$stamp)"
        }
    }
}
Write-Output ''
Write-Output "Tools are in $Destination"
Write-Output 'Next: point each repository at the new wrapper (docs/tools.md step 2):'
Write-Output "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$Destination\set-credential-helper.ps1`" -Repository <repo folder> [...]"
Write-Output 'Agent worker (docs/tools.md):'
Write-Output "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$Destination\agents.ps1`" -Root <repo folder> doctor"
