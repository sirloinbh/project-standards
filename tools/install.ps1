# Installs the personal account tools into one folder shared by every sirloinbh project.
# It never deletes or changes an old %LOCALAPPDATA%\gh-workout-memo folder; deleting it is a user step.
# It also updates this PC's global agent instructions, which live outside every repository (#365).
# A custom -Destination without -UserHome leaves them alone, so a test install never edits the real ones.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1 [-Destination <folder>] [-UserHome <folder>]
param(
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'sirloinbh-tools'),
    [string]$UserHome,
    # Test hook: keep the user PATH in this file instead of the real user environment.
    [string]$UserPathFile
)
$ErrorActionPreference = 'Stop'
# Target name (relative to Destination) -> source file.
$files = [ordered]@{}
foreach ($name in @('gh-project.ps1', 'project-terminal.ps1', 'open-vscode-account-b.cmd', 'set-credential-helper.ps1', 'server-ip.ps1', 'server-ssh.ps1', 'bin/server-ip.cmd', 'bin/server-ssh.cmd')) {
    $files[$name] = Join-Path $PSScriptRoot $name
}

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
# The server-ip and server-ssh shims must be found in any terminal, so their own folder (bin, only .cmd files) goes on the
# user PATH (#798). It must not be the tools folder: next to the .ps1 files PowerShell would run the blocked .ps1 first.
# A custom -Destination is a test install and leaves the real PATH alone, unless -UserPathFile redirects it.
if ($UserPathFile -or -not $PSBoundParameters.ContainsKey('Destination')) {
    $bin = Join-Path $Destination 'bin'
    $same = { param($a, $b) $a.TrimEnd([char]92) -ieq $b.TrimEnd([char]92) }
    $current = if ($UserPathFile) { if (Test-Path -LiteralPath $UserPathFile) { [IO.File]::ReadAllText($UserPathFile).Trim() } else { '' } } else { [Environment]::GetEnvironmentVariable('Path', 'User') }
    $entries = @($current -split ';' | Where-Object { $_ })
    # An earlier version put the tools folder itself on the PATH; drop it.
    $kept = @($entries | Where-Object { -not (& $same $_ $Destination) })
    $hasBin = @($kept | Where-Object { & $same $_ $bin }).Count -gt 0
    if ($hasBin -and $kept.Count -eq $entries.Count) {
        Write-Output 'unchanged  user PATH'
    } else {
        if (-not $hasBin) { $kept = $kept + $bin }
        $updated = $kept -join ';'
        if ($UserPathFile) { [IO.File]::WriteAllText($UserPathFile, $updated) } else { [Environment]::SetEnvironmentVariable('Path', $updated, 'User') }
        Write-Output "updated    user PATH (bin folder $bin; open a new terminal)"
    }
}
Write-Output ''
Write-Output "Tools are in $Destination"
Write-Output 'Next: point each repository at the new wrapper (docs/tools.md step 2):'
Write-Output "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$Destination\set-credential-helper.ps1`" -Repository <repo folder> [...]"