@echo off
rem Runs server-ip.ps1 from the tools folder above this bin folder, whatever the PowerShell execution policy is (#798).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\server-ip.ps1" %*
exit /b %errorlevel%
