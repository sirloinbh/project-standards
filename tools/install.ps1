# Installs the personal account tools into one folder shared by every sirloinbh project.
# It never deletes or changes the previous location (%LOCALAPPDATA%\gh-workout-memo).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1 [-Destination <folder>]
param(
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'sirloinbh-tools')
)
$ErrorActionPreference = 'Stop'
$files = @('gh-project.ps1', 'project-terminal.ps1', 'open-vscode-account-b.cmd', 'set-credential-helper.ps1')
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($name in $files) {
    $source = Join-Path $PSScriptRoot $name
    $target = Join-Path $Destination $name
    if (Test-Path $target) {
        if ((Get-FileHash $source).Hash -eq (Get-FileHash $target).Hash) {
            Write-Output "unchanged  $name"
            continue
        }
        # Keep the replaced copy so a bad update can be rolled back by hand.
        Copy-Item $target "$target.bak-$stamp"
        Write-Output "backed up  $name -> $name.bak-$stamp"
    }
    Copy-Item $source $target
    Write-Output "installed  $name"
}
Write-Output ''
Write-Output "Tools are in $Destination"
Write-Output 'Next: point each repository at the new wrapper (docs/tools.md step 2):'
Write-Output "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$Destination\set-credential-helper.ps1`" -Repository <repo folder> [...]"
