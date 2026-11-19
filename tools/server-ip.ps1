# Prints the shared server's public IPv4 address, so docs and scripts never need it typed by hand (#794).
# 1. SSM parameter /sirloinbh/shared/server-static-ip (shared-aws-infrastructure#69), read with the personal AWS profile.
# 2. If that fails (no permission yet, no network to AWS), the address of auth.daysofme.com in DNS, with a warning.
# Usage: server-ip.ps1 [-Profile <aws profile>] [-Region <region>] [-HostName <dns name>]
# The profile defaults to SIRLOINBH_AWS_PROFILE, then workout-personal. Use the personal profile, never the company one.
param(
    [string]$Profile = $(if ($env:SIRLOINBH_AWS_PROFILE) { $env:SIRLOINBH_AWS_PROFILE } else { 'workout-personal' }),
    [string]$Region = 'ap-northeast-2',
    [string]$HostName = 'auth.daysofme.com'
)
$ErrorActionPreference = 'Stop'
$parameter = '/sirloinbh/shared/server-static-ip'
$ipv4 = '^(\d{1,3}\.){3}\d{1,3}$'

$ip = $null
try {
    $out = & aws ssm get-parameter --name $parameter --query Parameter.Value --output text --profile $Profile --region $Region 2>$null
    if ($LASTEXITCODE -eq 0 -and "$out".Trim() -match $ipv4) { $ip = "$out".Trim() }
} catch {
    # No aws CLI or no credentials: use DNS below.
}
if (-not $ip) {
    $found = [System.Net.Dns]::GetHostAddresses($HostName) | Where-Object { $_.AddressFamily -eq 'InterNetwork' } | Select-Object -First 1
    if (-not $found) { throw "server-ip: could not read $parameter and $HostName has no IPv4 address" }
    [Console]::Error.WriteLine("server-ip: could not read $parameter with profile $Profile; using the DNS address of $HostName")
    $ip = $found.IPAddressToString
}
Write-Output $ip
