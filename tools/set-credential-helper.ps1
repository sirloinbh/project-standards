# Points the repository-local Git credential helper of each repository at a gh-project.ps1 wrapper.
# Only the repository's own config (.git/config) changes; global Git settings stay as they are.
# Roll back by running it again with -ToolsDir set to the previous folder.
# Usage: set-credential-helper.ps1 -Repository <folder>[,<folder> ...] [-ToolsDir <folder>]
# Separate several folders with commas: powershell.exe -File cannot pass an array, so
# "-Repository a b" fails and "-Repository a,b" arrives as one string that is split here.
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Repository,
    [string]$ToolsDir = ''
)
$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 leaves $PSScriptRoot empty in parameter defaults of a script with
# [Parameter()] attributes when it runs through -File, so the default is resolved here.
if (-not $ToolsDir) { $ToolsDir = $PSScriptRoot }
$Repository = @($Repository | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$wrapper = (Join-Path $ToolsDir 'gh-project.ps1') -replace '\\', '/'
if (-not (Test-Path $wrapper)) { throw "gh-project.ps1 not found in $ToolsDir" }
$key = 'credential.https://github.com.helper'
# Quoted so an install folder with spaces still reaches powershell.exe as one path.
$helper = "!powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$wrapper`" auth git-credential"
# Windows PowerShell 5.1 drops an empty-string argument to native commands; '""' reaches git as "".
# It also passes embedded double quotes unescaped, which splits the helper into several arguments.
$legacy = $PSVersionTable.PSVersion.Major -lt 7
$empty = if ($legacy) { '""' } else { '' }
$helperArgument = if ($legacy) { $helper -replace '"', '\"' } else { $helper }
function Invoke-Git {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') failed with exit code $LASTEXITCODE" }
}
foreach ($repo in $Repository) {
    if (-not (Test-Path (Join-Path $repo '.git'))) { throw "$repo is not a Git repository" }
    $before = (& git -C $repo config --local --get-all $key) -join ' | '
    & git -C $repo config --local --unset-all $key 2>$null
    # An empty helper first clears helpers inherited from global config for github.com.
    Invoke-Git -C $repo config --local --add $key $empty
    Invoke-Git -C $repo config --local --add $key $helperArgument
    Invoke-Git -C $repo config --local credential.https://github.com.username sirloinbh
    Write-Output "$repo"
    Write-Output "  before: $before"
    Write-Output "  after:  $helper"
}
