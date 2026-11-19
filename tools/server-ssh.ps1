# Runs ssh to the shared server without typing its address (#794): `server-ssh "<command>"`, or `server-ssh` for a shell.
# The address comes from server-ip.ps1 (SSM first, then DNS). Extra arguments go to ssh unchanged, so a tunnel is
# `server-ssh -L 8101:127.0.0.1:8101`. The key defaults to ~/.ssh/workout-memo-lightsail; change it with SIRLOINBH_SERVER_KEY.
# Windows PowerShell 5.1 drops double quotes nested inside a native argument: keep the remote command free of them.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$SshArgs
)
$ErrorActionPreference = 'Stop'
$key = if ($env:SIRLOINBH_SERVER_KEY) { $env:SIRLOINBH_SERVER_KEY } else { Join-Path $HOME '.ssh/workout-memo-lightsail' }
$ip = & (Join-Path $PSScriptRoot 'server-ip.ps1')
if (-not $ip) { throw 'server-ssh: no server address' }
& ssh -i $key "ubuntu@$ip" @SshArgs
exit $LASTEXITCODE
