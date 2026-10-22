@echo off
rem Opens VS Code with the personal (account B) profile.
rem   open-vscode-account-b.cmd --project <sirloinbh project folder>
rem     company gh config, no inherited GitHub tokens, personal Codex home, personal VS Code data.
rem   open-vscode-account-b.cmd <other folder or VS Code arguments>
rem     keeps the caller's GitHub environment and uses the generic account B data folder.
setlocal
set "CODEX_HOME=%LOCALAPPDATA%\Codex-Account-B"
rem Existing personal VS Code data (extensions, logins). The name is historical; renaming it would lose that state.
if not defined SIRLOINBH_VSCODE_DATA set "SIRLOINBH_VSCODE_DATA=%LOCALAPPDATA%\VSCode-Account-B-workout-memo"
if /I "%~1"=="--project" goto project
call code --user-data-dir "%LOCALAPPDATA%\VSCode-Account-B" --new-window %*
exit /b %errorlevel%

:project
if "%~2"=="" (
    echo Usage: %~nx0 --project ^<folder^> 1>&2
    exit /b 2
)
set "GH_CONFIG_DIR=%APPDATA%\GitHub CLI"
set "GH_TOKEN="
set "GITHUB_TOKEN="
call code --user-data-dir "%SIRLOINBH_VSCODE_DATA%" --new-window "%~f2"
exit /b %errorlevel%
