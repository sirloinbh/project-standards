# 개인 계정 도구 (tools/)

회사 계정(`byunghKim`)과 개인 계정(`sirloinbh`)을 한 PC에서 나눠 쓰기 위한 도구다. 원래 workout-memo `scripts/`에 있었고, 9개 리포가 함께 쓰도록 중앙으로 옮겼다(#19).

| 파일 | 하는 일 |
|---|---|
| `gh-project.ps1` | 개인 설정(`%USERPROFILE%\.config\gh-personal`)과 `sirloinbh` 계정으로만 `gh`를 실행한다. 상속받은 토큰을 지우고, 끝나면 호출한 쪽 환경을 되돌린다. Git credential helper로도 쓴다 |
| `project-terminal.ps1` | VS Code 터미널 초기화. 기본 `gh`는 회사 설정으로 두고, `ghp` 함수(개인 계정)를 만든다. 개인 `CODEX_HOME`을 지정한다. `ghp`는 같은 폴더의 `gh-project.ps1`을 부르므로 설치 위치에 상관없다 |
| `open-vscode-account-b.cmd` | 개인 VS Code 실행기. `--project <폴더>`로 열면 회사 gh 설정, 토큰 제거, 개인 Codex, 개인 VS Code 데이터 폴더로 연다. 다른 폴더는 기존 환경을 그대로 둔다 |
| `install.ps1` | 위 파일과 `set-credential-helper.ps1`을 `%LOCALAPPDATA%\sirloinbh-tools`에 설치한다. 바뀐 파일은 `.bak-<시각>`으로 백업하고, 예전 위치(`%LOCALAPPDATA%\gh-workout-memo`)는 건드리지 않는다 |
| `set-credential-helper.ps1` | 리포마다 `.git/config`의 credential helper를 지정한 `gh-project.ps1`로 바꾼다. 전역 Git 설정은 바꾸지 않는다 |
| `agents/` | 로컬 에이전트 워커. 아래 [로컬 에이전트 워커](#로컬-에이전트-워커-toolsagents) 참고. 아직 `install.ps1`이 설치하지 않는다(#166) |

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

## 로컬 에이전트 워커 (tools/agents)

이슈 하나를 받아 테스트 작성 → 구현 → 독립 검토 → 호스트 검사 → PR → CI 확인까지 진행하는 로컬 워커다. workout-memo `scripts/agents/`에서 옮겼다(#165). 하위 리포에 복사하지 않고, PC에 설치한 한 벌로 여러 리포를 다룬다. 설치와 PowerShell 실행기(`agents.ps1`)는 #166, workout-memo 전환은 #167에서 한다.

```powershell
node tools\agents\cli.mjs --root <리포 폴더> doctor
node tools\agents\cli.mjs --root <리포 폴더> enqueue 42 --slug csv-export
node tools\agents\cli.mjs --root <리포 폴더> work --once
```

- **대상 리포:** `--root`(없으면 현재 폴더). Git 리포 최상위여야 한다. 큐·잠금·worktree·로그는 그 리포의 `.local/agent-workflow/`에 둔다.
- **리포 이름:** `origin` 주소에서 읽는다. `sirloinbh` 소유이고 `registry/projects.json`의 `repos`에 있는 리포만 허용한다. 레지스트리는 `tools/agents/` 기준 `../../registry/`(이 리포) 또는 `../registry/`(설치본)에서 찾는다.
- **브랜치와 변경 기록:** std-git-writing 형식 `<type>/<이슈번호>-<영문-요약>`과 `docs/changes/<이슈번호>-<영문-요약>.md`. `type`은 `--task-kind documentation`이면 `docs`, 아니면 `feat`이다. 영문 요약은 `--slug`로 주고, 없으면 제목의 영문 단어 앞 5개, 그것도 없으면 `agent-task`를 쓴다. #165 이전에 등록된 작업은 저장된 브랜치와 `docs/changes/<번호>-agent-task.md`를 그대로 쓴다.
- **GitHub 호출:** Windows에서는 설치 폴더의 `gh-project.ps1`(`tools/agents/../gh-project.ps1`)을 쓴다.
- **PC별 설정:** `<리포>/.local/agent-workflow/config.json`의 `codexExecutable`, `npmCli`, `browserExecutable`. 커밋하지 않는다.

### 리포 설정 파일 `.agents.json`

워커를 쓰는 리포의 루트에 커밋한다. 없으면 모두 기본값이다. 모르는 키나 잘못된 형식이 있으면 워커가 어떤 명령도 실행하지 않고 멈춘다.

| 키 | 기본값 | 뜻 |
|---|---|---|
| `checkScript` | `"check"` | 호스트 검사로 실행할 npm 스크립트 이름(`npm run <이름>`). 셸 명령은 받지 않는다 |
| `database.tables` | 없음 | DB 사전검사로 확인할 테이블과 컬럼 `{ "<테이블>": ["<컬럼>", ...] }`. 없으면 스키마 사전검사를 건너뛴다. DB가 필요한 작업은 이때도 전용 `TEST_DATABASE_URL`이 있어야 한다 |
| `browser.checkArgs` | 없음 | 브라우저 검증 명령 인자. 실행 파일은 PC별 `browserExecutable`. 없으면 예전처럼 PC별 `config.json`의 `browserCheckArgs`를 쓴다 |
| `autoMerge` | `false` | `true`일 때만 CI 통과 후 워커가 PR을 병합한다. 아니면 PR을 ready로 바꾸고 병합은 사용자가 한다 |

workout-memo의 예(#128에서 자동 병합을 허용했다):

```json
{
  "database": {
    "tables": {
      "brands": ["id", "name"],
      "machines": ["id", "brand_id", "name", "base_weight", "notes"],
      "workouts": ["id", "date", "title", "notes", "created_at"],
      "sets": ["id", "workout_id", "exercise", "machine_id", "weight", "reps", "position", "notes"],
      "goals": ["id", "exercise", "target_weight", "target_reps", "start_date", "deadline"]
    }
  },
  "autoMerge": true
}
```

## 검증

- 에이전트 워커: `npm run test:agents`. `npm test`(따라서 `npm run check`)에도 포함된다. Windows에서는 `.github/workflows/agents.yml`이 한 번 더 돌린다. 가짜 git·gh·npm·Codex와 임시 리포만 쓴다.
- 계정 도구: `node --test scripts/test/tools.test.mjs` (Windows 전용 검사는 다른 OS에서 건너뛴다). 가짜 `gh`·`code`, 임시 사용자 폴더, 합성 토큰만 쓰며 실제 인증·설치본·VS Code는 건드리지 않는다.
