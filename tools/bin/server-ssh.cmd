@echo off
rem Runs ssh to the shared server in any terminal without typing its address (#798, #804).
rem ssh is started directly from here, with the arguments exactly as typed: no PowerShell in between, so the
rem passphrase prompt reads the console itself and a command with && or quotes arrives in one piece.
rem The address comes from server-ip.cmd (SSM first, then DNS). The key is SIRLOINBH_SERVER_KEY or ~/.ssh/workout-memo-lightsail.
setlocal
if defined SIRLOINBH_SERVER_KEY (set "key=%SIRLOINBH_SERVER_KEY%") else (set "key=%USERPROFILE%\.ssh\workout-memo-lightsail")
set "ip="
for /f "usebackq delims=" %%i in (`""%~dp0server-ip.cmd""`) do set "ip=%%i"
if not defined ip (
  echo server-ssh: no server address 1>&2
  exit /b 1
)
ssh -i "%key%" ubuntu@%ip% %*
exit /b %errorlevel%
