# 개인 계정 도구 (tools/)

회사 계정(`byunghKim`)과 개인 계정(`sirloinbh`)을 한 PC에서 나눠 쓰기 위한 도구다. 원래 workout-memo `scripts/`에 있었고, 9개 리포가 함께 쓰도록 중앙으로 옮겼다(#19).

| 파일 | 하는 일 |
|---|---|
| `gh-project.ps1` | 개인 설정(`%USERPROFILE%\.config\gh-personal`)과 `sirloinbh` 계정으로만 `gh`를 실행한다. 상속받은 토큰을 지우고, 끝나면 호출한 쪽 환경을 되돌린다. Git credential helper로도 쓴다 |
| `project-terminal.ps1` | VS Code 터미널 초기화. 기본 `gh`는 회사 설정으로 두고, `ghp` 함수(개인 계정)를 만든다. 개인 `CODEX_HOME`을 지정한다. `ghp`는 같은 폴더의 `gh-project.ps1`을 부르므로 설치 위치에 상관없다 |
| `open-vscode-account-b.cmd` | 개인 VS Code 실행기. `--project <폴더>`로 열면 회사 gh 설정, 토큰 제거, 개인 Codex, 개인 VS Code 데이터 폴더로 연다. 다른 폴더는 기존 환경을 그대로 둔다 |
| `install.ps1` | 위 파일과 `set-credential-helper.ps1`을 `%LOCALAPPDATA%\sirloinbh-tools`에 설치한다. 바뀐 파일은 `.bak-<시각>`으로 백업하고, 예전 위치(`%LOCALAPPDATA%\gh-workout-memo`)는 건드리지 않는다 |
| `set-credential-helper.ps1` | 리포마다 `.git/config`의 credential helper를 지정한 `gh-project.ps1`로 바꾼다. 전역 Git 설정은 바꾸지 않는다 |

## 옮기는 절차 [사용자] (#21)

1. **설치**
   ```powershell
   cd C:\Users\byunghk\Documents\GitHub\project-standards
   git switch main; git pull
   powershell -NoProfile -ExecutionPolicy Bypass -File tools\install.ps1
   ```
2. **10개 리포의 Git 인증을 새 위치로 바꾸기**
   ```powershell
   $tools = "$env:LOCALAPPDATA\sirloinbh-tools"
   $repos = 'project-standards','workout-memo','study-log','health-log','life-journal','money-ledger','english-study','plan-routine','dev-career-portfolio','shared-aws-infrastructure' |
     ForEach-Object { "C:\Users\byunghk\Documents\GitHub\$_" } | Where-Object { Test-Path $_ }
   powershell -NoProfile -ExecutionPolicy Bypass -File "$tools\set-credential-helper.ps1" -Repository $repos
   ```
   출력의 `before`/`after`로 바뀐 내용을 확인한다.
3. **확인**
   ```powershell
   & "$env:LOCALAPPDATA\sirloinbh-tools\gh-project.ps1" api user --jq .login   # sirloinbh
   cd C:\Users\byunghk\Documents\GitHub\study-log; git fetch                     # 인증 오류 없이 끝나야 함
   ```
4. **바탕화면 실행기 바꾸기:** 기존 `VSCode-계정B-*.cmd`를 지우고, 리포마다 다음 한 줄짜리 실행기를 만든다.
   ```bat
   @echo off
   call "%LOCALAPPDATA%\sirloinbh-tools\open-vscode-account-b.cmd" --project "C:\Users\byunghk\Documents\GitHub\study-log"
   ```
5. **VS Code 터미널:** 동기화가 각 리포의 `.vscode/settings.json`을 새 위치(`sirloinbh-tools\project-terminal.ps1`)로 바꾼다. 그 전까지는 예전 위치를 쓰는 기존 설정 그대로 동작한다. 그래서 1–3단계는 첫 동기화(#97)보다 먼저 해야 한다.
6. **정리:** 모든 리포가 새 위치로 동작하는 것을 확인한 뒤에 예전 폴더 `%LOCALAPPDATA%\gh-workout-memo`를 지운다. 그 폴더의 `hosts.yml`, `config.yml`은 예전 gh 설정이므로, 지우기 전에 더 쓰지 않는지 확인한다.

## 되돌리기

- **Git 인증을 예전 위치로:**
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\sirloinbh-tools\set-credential-helper.ps1" -Repository <리포 폴더> -ToolsDir "$env:LOCALAPPDATA\gh-workout-memo"
  ```
- **잘못 설치된 파일:** `%LOCALAPPDATA%\sirloinbh-tools`의 `*.bak-<시각>` 파일을 원래 이름으로 되돌린다.

## 검증

`node --test scripts/test/tools.test.mjs` (Windows 전용 검사는 다른 OS에서 건너뛴다). 가짜 `gh`·`code`, 임시 사용자 폴더, 합성 토큰만 쓰며 실제 인증·설치본·VS Code는 건드리지 않는다.
