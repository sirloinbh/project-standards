# 개인 계정 도구 (tools/)

회사 계정(`byunghKim`)과 개인 계정(`sirloinbh`)을 한 PC에서 나눠 쓰기 위한 도구다. 원래 workout-memo `scripts/`에 있었고, 9개 리포가 함께 쓰도록 중앙으로 옮겼다(#19).

| 파일 | 하는 일 |
|---|---|
| `gh-project.ps1` | 개인 설정(`%USERPROFILE%\.config\gh-personal`)과 `sirloinbh` 계정으로만 `gh`를 실행한다. 상속받은 토큰을 지우고, 끝나면 호출한 쪽 환경을 되돌린다. Git credential helper로도 쓴다 |
| `project-terminal.ps1` | VS Code 터미널 초기화. 기본 `gh`는 회사 설정으로 두고, `ghp` 함수(개인 계정)를 만든다. 개인 `CODEX_HOME`을 지정한다. `ghp`는 같은 폴더의 `gh-project.ps1`을 부르므로 설치 위치에 상관없다 |
| `open-vscode-account-b.cmd` | 개인 VS Code 실행기. `--project <폴더>`로 열면 회사 gh 설정, 토큰 제거, 개인 Codex, 개인 VS Code 데이터 폴더로 연다. 다른 폴더는 기존 환경을 그대로 둔다 |
| `install.ps1` | 위 파일, `set-credential-helper.ps1`, 에이전트 워커(`agents.ps1`, `agents/*.mjs`, `registry/projects.json`, `versions.json`)를 `%LOCALAPPDATA%\sirloinbh-tools`에 설치한다. 바뀐 파일은 `.bak-<시각>`으로 백업하고, 예전 위치(`%LOCALAPPDATA%\gh-workout-memo`)는 건드리지 않는다 |
| `set-credential-helper.ps1` | 리포마다 `.git/config`의 credential helper를 지정한 `gh-project.ps1`로 바꾼다. 전역 Git 설정은 바꾸지 않는다 |
| `agents.ps1`, `agents/` | 로컬 에이전트 워커의 실행기와 워커. 아래 [로컬 에이전트 워커](#로컬-에이전트-워커-toolsagents) 참고 |

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
- **잘못 설치된 파일:** `%LOCALAPPDATA%\sirloinbh-tools`의 `*.bak-<시각>` 파일을 원래 이름으로 되돌린다. 워커 파일은 `agents\`, 레지스트리는 `registry\` 아래에 백업된다.
- **에이전트 워커를 workout-memo 사본으로:** `agents.ps1 -Root <리포> stop`으로 설치본 워커를 멈추고 리포 안의 `scripts\agents.ps1`을 쓴다(#167에서 지우기 전까지). 큐(`.local/agent-workflow/`)는 같은 위치라 그대로 이어진다.
- **에이전트 워커 제거:** 워커를 멈춘 뒤 설치 폴더의 `agents.ps1`, `agents\`, `registry\`, `versions.json`을 지운다. 리포의 `.local/agent-workflow/`는 커밋되지 않는 작업 상태이므로 필요 없을 때 따로 지운다.

## 로컬 에이전트 워커 (tools/agents)

이슈 하나를 받아 테스트 작성 → 구현 → 독립 검토 → 호스트 검사 → PR → CI 확인까지 진행하는 로컬 워커다. workout-memo `scripts/agents/`에서 옮겼다(#165). 하위 리포에 복사하지 않고, PC에 설치한 한 벌로 여러 리포를 다룬다(#166). workout-memo 전환은 #167에서 한다.

### 설치 [사용자]

[옮기는 절차](#옮기는-절차-사용자-21) 1단계의 `install.ps1`이 워커도 함께 설치한다.

```text
%LOCALAPPDATA%\sirloinbh-tools\
  agents.ps1              실행기
  agents\*.mjs            워커
  registry\projects.json  워커를 쓸 수 있는 리포 목록
  versions.json           Node 버전 비교용
```

`tools/agents/`나 레지스트리가 바뀌면 `git pull` 뒤 `install.ps1`을 다시 실행한다. 바뀐 파일만 백업하고 덮어쓴다. 원본에서 지운 워커 파일은 설치 폴더에 남으므로 직접 지운다.

### 실행

```powershell
$agents = "$env:LOCALAPPDATA\sirloinbh-tools\agents.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <리포 폴더> doctor
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <리포 폴더> enqueue -Issue 42 -Slug csv-export
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <리포 폴더> start
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <리포 폴더> status
powershell -NoProfile -ExecutionPolicy Bypass -File $agents -Root <리포 폴더> stop
```

| 명령 | 하는 일 |
|---|---|
| `status`(기본) | 그 리포의 큐와 워커 상태를 JSON으로 보여 준다 |
| `doctor` | 계정, 리포 등록, `.agents.json`, Codex, npm을 확인한다 |
| `start` | `doctor`가 통과하면 워커를 숨은 창으로 띄운다. 로그는 `<리포>\.local\agent-workflow\worker.*.log` |
| `stop` | 현재 단계가 끝나면 워커가 멈추도록 요청한다 |
| `smoke -Role <역할>` | 작은 읽기 전용 모델 요청으로 연결을 확인한다 |
| `enqueue -Issue <번호>` | 이슈를 큐에 넣고 worktree를 만든다. 옵션: `-TaskKind`, `-ReviewRole`, `-TestComplexity`, `-RequireDatabase`, `-RequireBrowser`, `-BranchType feat\|fix\|docs\|chore`, `-Slug` |
| `configure -Issue <번호>` | 대기 중이거나 멈춘 작업의 라우팅 옵션을 바꾼다 |
| `diagnose`, `retry`, `accept-requirements`, `cancel`, `handoff-tests` | `-Issue <번호>` 작업에 대해 실행한다 |

- **대상 리포:** `-Root`(없으면 현재 폴더). Git 리포 최상위가 아니면 아무것도 만들지 않고 멈춘다. 큐·잠금·worktree·로그는 그 리포의 `.local/agent-workflow/`에 두므로 리포끼리 섞이지 않고, 리포마다 워커를 따로 띄울 수 있다.
- **Node:** 대상 리포에 `.local\node-v<versions.json의 node>-win-x64\node.exe`가 있으면 그것을, 없으면 PATH의 `node.exe`를 쓴다. 버전이 `versions.json`과 다르면 경고(표준 오류)만 하고 계속한다.
- **Codex:** `CODEX_HOME`이 비어 있으면 `project-terminal.ps1`과 같은 `%LOCALAPPDATA%\Codex-Account-B`를 쓴다.
- **실행기 없이:** `node <도구 폴더>\agents\cli.mjs --root <리포 폴더> <명령>`도 같다(`enqueue 42 --slug csv-export`, `work --once` 등). 이 리포에서 개발할 때는 `node tools\agents\cli.mjs ...`를 쓴다.
- **리포 이름:** `origin` 주소에서 읽는다. `sirloinbh` 소유이고 `registry/projects.json`의 `repos`에 있는 리포만 허용한다. 레지스트리는 `tools/agents/` 기준 `../../registry/`(이 리포) 또는 `../registry/`(설치본)에서 찾는다.
- **브랜치와 변경 기록:** std-git-writing 형식 `<type>/<이슈번호>-<영문-요약>`과 `docs/changes/<이슈번호>-<영문-요약>.md`. `type`은 `--branch-type feat|fix|docs|chore`로 고른다. 주지 않으면 `--task-kind documentation`일 때 `docs`, 그 밖에는 `feat`이다. 버그 수정은 `fix`, 설정·정리·이전은 `chore`를 준다(2026-10-22 사용자 결정). 영문 요약은 `--slug`로 주고, 없으면 제목의 영문 단어 앞 5개, 그것도 없으면 `agent-task`를 쓴다. #165 이전에 등록된 작업은 저장된 브랜치와 `docs/changes/<번호>-agent-task.md`를 그대로 쓴다.
- **GitHub 호출:** Windows에서는 설치 폴더의 `gh-project.ps1`(`tools/agents/../gh-project.ps1`)을 쓴다.
- **PC별 설정:** `<리포>/.local/agent-workflow/config.json`의 `codexExecutable`, `npmCli`, `browserExecutable`. 커밋하지 않는다.

### 리포 설정 파일 `.agents.json`

워커를 쓰는 리포의 루트에 커밋한다. 없으면 모두 기본값이다. 모르는 키나 잘못된 형식이 있으면 워커가 어떤 명령도 실행하지 않고 멈춘다.

| 키 | 기본값 | 뜻 |
|---|---|---|
| `checkScript` | `"check"` | 호스트 검사로 실행할 npm 스크립트 이름(`npm run <이름>`). 셸 명령은 받지 않는다 |
| `database.tables` | 없음 | DB 사전검사로 확인할 테이블과 컬럼 `{ "<테이블>": ["<컬럼>", ...] }`. 없으면 스키마 사전검사를 건너뛴다. DB가 필요한 작업은 이때도 전용 `TEST_DATABASE_URL`이 있어야 한다 |
| `browser.checkArgs` | 없음 | 브라우저 검증 명령 인자. 실행 파일은 PC별 `browserExecutable`. 없으면 예전처럼 PC별 `config.json`의 `browserCheckArgs`를 쓴다 |
| `autoMerge` | `true` | CI 통과 후 워커가 PR을 병합한다. `false`면 PR을 ready로 바꾸고 병합은 사용자가 한다 |

**자동 병합은 기본으로 켜져 있다(2026-10-22 사용자 결정).** main 병합이 곧 운영 배포인 리포처럼 사람이 병합을 확인해야 하는 리포는 `.agents.json`에 `"autoMerge": false`를 넣어 끈다.

#### 리포별 자동 병합

기본값 `true`를 유지하고, 자동 병합을 허용하지 않은 리포만 `false`로 끈다(2026-10-23 사용자 결정, #184). 중앙 `AGENTS.md`의 "하위 리포 PR은 사용자에게 먼저 확인" 규칙은 대화형 에이전트에 적용되고, 워커가 여는 PR은 이 표를 따른다. 앱 `AGENTS.md`도 같은 예외를 적는다.

| 리포 | `autoMerge` | 근거 |
|---|---|---|
| `workout-memo` | `true` (기본값, 파일에 적지 않음) | #128에서 사용자가 자동 병합을 허용 |
| `study-log`, `health-log`, `life-journal`, `money-ledger`, `english-study`, `plan-routine`, `dev-career-portfolio` | `false` | main 병합이 곧 운영 배포이고 자동 병합을 허용한 결정이 없다 |
| `project-standards`, `shared-aws-infrastructure` | 해당 없음 | 레지스트리 `repos`에 없어 워커가 실행되지 않는다. `project-standards`는 중앙 `AGENTS.md`대로 에이전트가 병합한다 |

- **파일이 없으면 자동 병합된다.** 그래서 `false`인 리포는 워커를 도입하는 PR에 `.agents.json`(`{"autoMerge": false}` 이상)을 함께 넣고, 도입 전에 `agents.ps1 -Root <리포> doctor`의 `autoMerge false`를 확인한다.
- **동기화로 배포하지 않는다.** `.agents.json`은 `checkScript`·`database.tables`처럼 리포마다 다른 값을 담고, 동기화의 JSON 필드 관리(`fields`)는 없는 파일을 만들지 않아 "파일이 없으면 자동 병합" 문제를 풀지 못한다. 리포별 값은 레지스트리가 아니라 이 표가 원본이다.
- 표의 값을 바꾸려면 사용자 결정을 이슈에 기록하고 이 표와 해당 리포의 `.agents.json`을 함께 고친다.

**DB 사전검사가 없는 리포의 예.** 검사 스크립트 이름만 바꾸고, main 병합이 곧 배포라서 자동 병합을 끈다. 모두 기본값이면 파일을 만들지 않아도 된다.

```json
{
  "checkScript": "verify",
  "autoMerge": false
}
```

**DB 사전검사가 있는 리포의 예(workout-memo).** 테이블만 지정하고 자동 병합은 기본값을 쓴다.

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
  }
}
```

## 검증

- 에이전트 워커: `npm run test:agents`. `npm test`(따라서 `npm run check`)에도 포함된다. Windows에서는 `.github/workflows/agents.yml`이 한 번 더 돌린다. 가짜 git·gh·npm·Codex와 임시 리포만 쓴다. 실행기 검사(임시 폴더에 설치한 `agents.ps1 -Root <폴더> status`가 가짜 리포 두 곳에서 각자의 큐만 보여 줌, `-Root`·`-BranchType`·`-Slug` 전달, PowerShell→Node 경계 2개)는 Windows에서만 돈다.
- 계정 도구: `node --test scripts/test/tools.test.mjs` (Windows 전용 검사는 다른 OS에서 건너뛴다). 설치 검사는 워커·레지스트리·`versions.json`이 설치되고 바뀐 워커 파일이 백업되는지도 본다. 가짜 `gh`·`code`, 임시 사용자 폴더, 합성 토큰만 쓰며 실제 인증·설치본·VS Code는 건드리지 않는다.
