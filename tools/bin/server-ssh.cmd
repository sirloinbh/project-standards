@echo off
rem Runs server-ssh.ps1 from the tools folder above this bin folder, whatever the PowerShell execution policy is (#798).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\server-ssh.ps1" %*
exit /b %errorlevel%
