# Installs the personal account tools into one folder shared by every sirloinbh project.
# It never deletes or changes the previous location (%LOCALAPPDATA%\gh-workout-memo).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1 [-Destination <folder>]
param(
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'sirloinbh-tools')
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
Write-Output ''
Write-Output "Tools are in $Destination"
Write-Output 'Next: point each repository at the new wrapper (docs/tools.md step 2):'
Write-Output "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$Destination\set-credential-helper.ps1`" -Repository <repo folder> [...]"
Write-Output 'Agent worker (docs/tools.md):'
Write-Output "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$Destination\agents.ps1`" -Root <repo folder> doctor"
