# #19 개인 계정 도구를 중앙으로 옮기기 (tools/, 설치 위치, VS Code 설정)

## 변경

| 파일 | 내용 |
|---|---|
| `tools/gh-project.ps1` | workout-memo 원본 그대로 (8개 앱에서 같음) |
| `tools/project-terminal.ps1` | `ghp`가 `%LOCALAPPDATA%\gh-workout-memo` 대신 **같은 폴더**의 `gh-project.ps1`을 부르게 바꿨다 |
| `tools/open-vscode-account-b.cmd` | workout-memo 전용이던 실행기를 일반화했다. `--project <폴더>`면 개인 환경으로 열고, 그 밖의 폴더는 기존 환경을 유지한다. 개인 VS Code 데이터 폴더는 기존 `VSCode-Account-B-workout-memo`를 그대로 쓴다(이름을 바꾸면 확장·로그인 상태를 잃음) |
| `tools/install.ps1` | `%LOCALAPPDATA%\sirloinbh-tools`에 설치한다. 바뀌는 파일만 백업하고, 예전 위치는 건드리지 않는다 |
| `tools/set-credential-helper.ps1` | 리포의 credential helper를 새 위치로 바꾸거나 예전 위치로 되돌린다 |
| `templates/common/.vscode/settings.json.tmpl` | 터미널 프로필 이름을 "sirloinbh PowerShell"로, 경로를 `sirloinbh-tools`로 바꿨다. 9개 리포에 동기화된다(스냅샷 9곳 추가) |
| `.gitattributes` | `*.cmd`를 CRLF로 체크아웃한다. LF만 있는 배치 파일은 `goto`·레이블이 잘못 동작할 수 있다 |
| `docs/tools.md` | 설치, 리포별 인증 전환, 바탕화면 실행기, 되돌리기 |
| `scripts/test/tools.test.mjs` | workout-memo `project-github-auth.test.mjs`에서 옮긴 Windows 검사와 설치·인증 전환 검사 |

## 테스트로 찾은 문제

- **빈 문자열 인자 문제:** Windows PowerShell 5.1은 외부 프로그램에 넘기는 빈 문자열 인자(`''`)를 버린다. 그래서 전역 helper를 지우는 빈 helper 줄이 git에 전달되지 않았다. PowerShell 5에서는 `'""'`를 넘기도록 고쳤다. 실제 git 설정 파일에 `helper =` 빈 줄이 먼저 들어가는 것을 확인했다.

## 이후 할 일

- 실제 설치와 10개 리포의 인증 전환은 사용자가 한다(#21). 동기화되는 VS Code 설정이 새 위치를 쓰므로, 첫 동기화(#97)의 선행 조건에 #21을 추가했다.
- workout-memo의 `scripts/project-terminal.ps1`, `open-vscode-account-b.cmd`, `docs/project-github-auth.md`, 인증 테스트 정리는 workout-memo 리포의 별도 이슈로 한다.

## 검증

- `npm run check`: 테스트 138개 통과. Windows에서 실행해 PowerShell·cmd 검사 12개가 실제로 돌았다.
