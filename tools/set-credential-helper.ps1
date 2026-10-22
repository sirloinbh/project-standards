# Points the repository-local Git credential helper of each repository at a gh-project.ps1 wrapper.
# Only the repository's own config (.git/config) changes; global Git settings stay as they are.
# Roll back by running it again with -ToolsDir set to the previous folder.
# Usage: set-credential-helper.ps1 -Repository <folder> [<folder> ...] [-ToolsDir <folder>]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Repository,
    [string]$ToolsDir = $PSScriptRoot
)
$ErrorActionPreference = 'Stop'
$wrapper = (Join-Path $ToolsDir 'gh-project.ps1') -replace '\\', '/'
if (-not (Test-Path $wrapper)) { throw "gh-project.ps1 not found in $ToolsDir" }
$key = 'credential.https://github.com.helper'
$helper = "!powershell.exe -NoProfile -ExecutionPolicy Bypass -File $wrapper auth git-credential"
# Windows PowerShell 5.1 drops an empty-string argument to native commands; '""' reaches git as "".
$empty = if ($PSVersionTable.PSVersion.Major -ge 7) { '' } else { '""' }
foreach ($repo in $Repository) {
    if (-not (Test-Path (Join-Path $repo '.git'))) { throw "$repo is not a Git repository" }
    $before = (& git -C $repo config --local --get-all $key) -join ' | '
    & git -C $repo config --local --unset-all $key 2>$null
    # An empty helper first clears helpers inherited from global config for github.com.
    & git -C $repo config --local --add $key $empty
    & git -C $repo config --local --add $key $helper
    & git -C $repo config --local credential.https://github.com.username sirloinbh
    Write-Output "$repo"
    Write-Output "  before: $before"
    Write-Output "  after:  $helper"
}
