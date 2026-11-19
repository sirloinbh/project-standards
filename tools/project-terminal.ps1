# Keep the company gh command and select the existing personal Codex home.
$env:GH_CONFIG_DIR = Join-Path $env:APPDATA 'GitHub CLI'
Remove-Item Env:GH_TOKEN, Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
$env:CODEX_HOME = Join-Path $env:LOCALAPPDATA 'Codex-Account-B'

# The wrapper is installed next to this script, wherever the tools folder is.
$global:SirloinbhToolsDir = $PSScriptRoot

# Available even when PowerShell starts without loading a user profile.
function global:ghp {
    & (Join-Path $global:SirloinbhToolsDir 'gh-project.ps1') @args
}

# The shared server's address is read from SSM (fallback: DNS), so nobody types it (#794).
function global:server-ip {
    & (Join-Path $global:SirloinbhToolsDir 'server-ip.ps1') @args
}
function global:server-ssh {
    & (Join-Path $global:SirloinbhToolsDir 'server-ssh.ps1') @args
}
