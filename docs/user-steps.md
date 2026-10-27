# 직접 하실 일 (사용자 단계 모음)

에이전트가 대신할 수 없는 단계(비밀값, 원격 계정 설정, 로컬에만 있는 파일)를 모았습니다. 끝낸 항목은 이슈 번호와 함께 채팅으로 알려 주세요. **개인키·토큰 같은 비밀값은 채팅이나 문서에 붙여 넣지 마세요.**

| 순서 | 할 일 | 시간 | 이슈 | 상태 (2026-10-23 확인) |
|---|---|---|---|---|
| 0 | 로컬 `.env` 포트 바꾸기 | 5분 | (#95 후속) | 확인 안 함 (로컬 파일) |
| 1 | 개인 계정 도구를 새 위치로 설치 | 5분 | #21 | 안 함: `%LOCALAPPDATA%\sirloinbh-tools` 없음 |
| 2 | shared-aws-infrastructure 최신화와 Terraform state 준비 | 끝남 | #92 | 완료(2026-10-24): import로 state 재구성, plan "No changes" |
| 3 | GitHub App 만들기와 Actions 공유 설정 | 10분 | #86 | 안 함: `SYNC_APP_ID` 변수·`SYNC_APP_PRIVATE_KEY` secret 없음 |
| 4 | 공유 패키지 첫 배포와 접근 권한 | 10분 | #88 | 안 함: 패키지 태그·Release 없음 |
| 5 | 리포 설정 맞추기 (Dependabot, 병합 방식, workout-memo 보안) | 10분 | #22 | 안 함: Dependabot 알림 꺼짐 |
| 6 | (3을 이미 했다면) GitHub App에 Issues 쓰기 권한 추가 | 3분 | #40 | 3을 아직 안 해서 건너뜀 |
| 7 | Codex 훅 신뢰와 차단 확인 | 3분 | #180 | 안 함 (Codex CLI 0.144.4 설치됨, 규칙 판정은 PR #185로 기록) |
| 8 | 작업 PC 점검 (Claude Code 버전, 에이전트 실행기) | 3분 | #183 | 일부: Claude Code 2.1.309 확인. 실행기는 1 이후 |
| 9 | 리포 11개 secret scanning·push protection·CodeQL 켜기, App에 Code scanning 읽기 권한 추가 | 15분 | #261 | 안 함 (2026-10-27 추가) |
| 10 | Claude API 키 발급·지출 한도, SSM에 넣기, 서버 읽기 키 넣기 | 15분 | #266 | 안 함 (2026-10-27 추가) |
| 11 | healthchecks.io 계정·앱별 체크 만들고 서버 `.env`에 신호 주소 넣기 | 20분 | #286 | 안 함 (2026-10-27 추가) |

**남은 권장 순서는 1 → 3 → 4입니다.** 2는 끝났습니다. 1–4가 끝나면 첫 동기화(#97: workout-memo, `maxRollout` 1)를 시작할 수 있습니다. 0, 5, 7은 순서와 상관없이 언제든 하면 됩니다. 8은 1 직후에 합니다.

단계를 끝내면 "#21 끝"처럼 알려 주세요. 에이전트가 이어서 하는 일:

| 끝난 단계 | 에이전트가 이어서 하는 일 |
|---|---|
| 1 (#21) | 8(#183) 확인 안내 |
| 2 (#92) | 끝남: #93 인프라 리포 정비, #94 workout-memo에서 `infrastructure/` 제거. 다음은 #36 배포 템플릿 |
| 4 (#88) | `versions.json`에 패키지 버전 1.0.0을 넣는 PR |
| 1–4 모두 | #97 workout-memo 첫 동기화 PR (병합 전에 4-3 서버 토큰 필요) |

## 0. 로컬 `.env` 포트 바꾸기

포트를 슬롯 체계로 다시 배정했습니다([프로젝트 표](projects.md)). 각 리포의 로컬 `.env`에서 `DATABASE_URL`의 포트와 `PORT`를 아래 값으로 바꿉니다.

| 리포 | `PORT` (API) | `DATABASE_URL` 포트 (DB) | 웹 접속 |
|---|---|---|---|
| workout-memo | 3101 | 15401 | http://localhost:8101 |
| study-log | 3102 | 15402 | http://localhost:8102 |
| health-log | 3103 | 15403 | http://localhost:8103 |
| life-journal | 3104 | 15404 | http://localhost:8104 |
| money-ledger | 3105 | 15405 | http://localhost:8105 |
| english-study | 3106 | 15406 | http://localhost:8106 |
| plan-routine | 3107 | 15407 | http://localhost:8107 |
| dev-career-portfolio | 3108 | 15408 | http://localhost:8108 |

예: workout-memo는 `DATABASE_URL=postgres://workout:<비밀번호>@localhost:15401/workout`, `PORT=3101`.

그다음 각 리포에서 `docker compose up -d`를 실행하면 DB 컨테이너가 새 포트로 다시 열립니다. 데이터 볼륨은 그대로입니다.

## 1. 개인 계정 도구를 새 위치로 설치 (#21)

절차는 [tools.md](tools.md)의 "옮기는 절차" 1–4단계입니다. 설치(`tools\install.ps1`), 10개 리포의 Git 인증 경로 변경(`set-credential-helper.ps1`), 확인, 바탕화면 실행기 교체 순서입니다. **첫 동기화(#97)보다 먼저** 해야 합니다. 동기화가 VS Code 터미널 설정을 새 위치로 바꾸기 때문입니다.

## 2. shared-aws-infrastructure 최신화와 Terraform state 준비 (#92, 완료)

**2026-10-24에 끝났습니다.** 처음 apply한 PC에 접근할 수 없어 state를 잃었고, 지금 작업 PC에서 import로 다시 만들었습니다. 결과는 다음과 같습니다.

- shared-aws-infrastructure main을 workout-memo의 최신 `infrastructure/`로 fast-forward했습니다(`684542a`).
- AWS provider를 v6.68.0으로 올렸습니다(sirloinbh/shared-aws-infrastructure#2). v5는 고정 IP를 import할 수 없습니다.
- 4개를 import하고 3개를 새로 만든 뒤 `terraform plan` 결과가 "No changes"입니다. 고정 IP 주소는 그대로입니다.
- 이후 인프라 원본 정비(#93)와 workout-memo의 `infrastructure/` 제거(#94)도 끝났습니다.

### 다른 PC에서 인프라를 다룰 때

절차의 원본은 shared-aws-infrastructure의 `docs/operations.md`입니다. 상황별로 아래 장을 따릅니다.

| 상황 | `docs/operations.md` |
|---|---|
| 새 PC 준비: Terraform·AWS CLI 설치, Terraform 전용 IAM 사용자와 최소 권한 정책(루트 키를 만들지 않음), SSH 키, `terraform.tfvars` | 1장 |
| state 백업과 다른 PC로 옮기기 | 3장 |
| state를 잃었을 때 import로 다시 만들기 | 4장 |
| 새 PC의 SSH 키를 서버에 추가하기(브라우저 SSH 잠깐 허용) | 5장 |

순서를 정할 때 알아 둘 점:

1. **state가 어디 있는지 먼저 확인합니다.** 있으면 백업한 파일을 새 PC로 복사하고 plan이 "No changes"인지 봅니다. 없으면 4장의 import 절차로 갑니다. state 없이 apply하면 리소스가 중복으로 생깁니다.
2. **import할 수 없는 리소스가 둘 있습니다.** SSH 키 쌍은 콘솔에서 지운 뒤 다시 만들고, 방화벽 규칙은 apply가 같은 값으로 덮어씁니다. 그래서 import 직후 plan은 "4 to import, 3 to add, 0 to change, 0 to destroy"가 정상입니다. 교체(`-/+`)나 삭제가 보이면 apply하지 않습니다.
3. **provider 버전을 올렸다면 PR을 먼저 병합하고 apply합니다.** apply하면 state가 새 형식으로 저장되어 되돌릴 수 없습니다.
4. **허용 IP를 확인합니다.** 새 PC의 공인 IP가 `allowed_cidrs`에 없으면 SSH와 웹 접속이 막힙니다.

### PowerShell 5.1에서 명령을 붙여 넣을 때

#92를 진행하면서 실제로 겪은 문제입니다.

- **명령은 한 줄로 붙여 넣습니다.** 줄이 끊기면(`>>` 표시) 따옴표 안에 줄바꿈이 들어갑니다. `ssh-keygen -C` 주석이 두 줄이 되거나, `git config` 값이 두 항목으로 나뉘어 저장되었습니다.
- **빈 문자열 인수(`""`)는 실행 파일에 넘어가지 않습니다.** `git config --add credential.https://github.com.helper ""`를 PowerShell에서 실행하면 빈 helper 줄이 저장되지 않습니다. 인증 설정은 [tools.md](tools.md)의 `set-credential-helper.ps1`로 하고, 결과는 `git config --local --get-all credential.https://github.com.helper`로 확인합니다(첫 줄이 비어 있어야 함).
- **`<` 입력 리디렉션이 없습니다.** 파일 내용을 명령에 넘길 때는 웹 화면을 쓰거나 `Get-Content -Raw`를 씁니다.
- **파일은 BOM 없는 UTF-8로 씁니다.** `Set-Content`·`Out-File` 대신 `[IO.File]::WriteAllText(<경로>, <내용>, (New-Object Text.UTF8Encoding $false))`를 씁니다.
- **`ssh-keygen`은 `.ssh` 폴더를 만들지 않습니다.** 먼저 `New-Item -ItemType Directory -Force "$HOME\.ssh"`를 실행합니다.
- **AWS CLI가 처음 실행될 때 AI 에이전트용 스킬과 MCP 서버 설치를 묻습니다.** 필요하지 않으면 `n`으로 답합니다. `y`로 답하면 모든 프로젝트에 스킬 24개와 버전이 고정되지 않은 MCP 서버(`@latest`)가 등록됩니다.

## 3. GitHub App 만들기와 Actions 공유 설정 (#86)

**왜 필요한가요:** 중앙 리포가 9개 리포에 동기화 PR을 열려면 권한이 좁은 전용 App이 필요합니다. 하위 리포가 중앙의 공통 CI를 불러 쓰려면 공유 설정도 필요합니다. 자세한 절차와 키 교체 방법은 [github-app.md](github-app.md)에 있습니다.

### 3-1. App 만들기

GitHub에 `sirloinbh`로 로그인한 상태에서 Settings → Developer settings → GitHub Apps → New GitHub App.

| 항목 | 값 |
|---|---|
| GitHub App name | `project-standards-sync` |
| Homepage URL | `https://github.com/sirloinbh/project-standards` |
| Webhook | Active 체크 해제 |
| Repository permissions | Contents: Read and write / Pull requests: Read and write / Workflows: Read and write / Issues: Read and write / Administration: Read-only / Secrets: Read-only / Variables: Read-only (나머지는 No access, Metadata는 자동) |
| Where can this App be installed? | Only on this account |

Create 후 화면의 **App ID**(숫자)를 적어 둡니다.

### 3-2. 개인키 만들기와 등록

App 화면 아래 Generate a private key를 누르면 `.pem` 파일이 내려받아집니다.

project-standards → Settings → Secrets and variables → Actions에서 등록합니다.

- **Secrets** 탭 → New repository secret: 이름 `SYNC_APP_PRIVATE_KEY`, 값은 `.pem` 파일을 메모장으로 열어 `-----BEGIN`부터 `END-----`까지 전체를 붙여 넣습니다.
- **Variables** 탭 → New repository variable: 이름 `SYNC_APP_ID`, 값은 App ID 숫자입니다.

`.pem` 파일은 등록 직후 지웁니다. 다시 필요하면 새로 만들면 됩니다. PowerShell에는 `<` 입력 리디렉션이 없어서 명령줄 대신 웹 화면을 씁니다.

### 3-3. 설치

App 화면 → Install App → sirloinbh Install → Only select repositories에서 10개를 고릅니다: project-standards, workout-memo, study-log, health-log, life-journal, money-ledger, english-study, plan-routine, dev-career-portfolio, shared-aws-infrastructure.

### 3-4. 공통 CI 공유 허용

project-standards → Settings → Actions → General → Access에서 "Accessible from repositories owned by the user 'sirloinbh'"를 고르고 Save합니다.

### 3-5. 확인

project-standards → Actions → sync → Run workflow, 또는 `ghp workflow run sync.yml -R sirloinbh/project-standards`. 로그에 "설치 토큰 발급 확인. maxRollout 0이라 동기화할 대상이 없습니다."가 나오면 성공입니다. 지금은 `maxRollout`이 0이라 어느 리포에도 PR이 열리지 않습니다. 실패하면 App ID 오타, 개인키 전체가 들어갔는지, 설치 범위를 확인하세요.

## 4. 공유 패키지 첫 배포와 접근 권한 (#88)

**왜 필요한가요:** 하위 리포가 공유 설정 패키지 4종을 설치하려면 먼저 배포돼 있어야 하고, 각 리포가 읽을 권한이 있어야 합니다. 배포는 태그 push로만 하도록 정했기 때문에 직접 하셔야 합니다.

### 4-1. 태그 4개 push (배포 시작)

```powershell
cd <project-standards 폴더>
git fetch origin
git tag eslint-config/v1.0.0 origin/main
git tag prettier-config/v1.0.0 origin/main
git tag tsconfig/v1.0.0 origin/main
git tag design-tokens/v1.0.0 origin/main
git push origin eslint-config/v1.0.0
git push origin prettier-config/v1.0.0
git push origin tsconfig/v1.0.0
git push origin design-tokens/v1.0.0
```

**태그는 한 번에 하나씩 push합니다.** GitHub는 한 번의 push에 태그가 3개보다 많으면 워크플로를 실행하지 않습니다. 2026-10-24에 4개를 한 번에 push해서 publish가 실행되지 않았습니다(#198). 이미 한꺼번에 push했다면 `git push origin --delete <태그...>`로 원격 태그를 지운 뒤 하나씩 다시 push합니다.

로컬 브랜치는 Fork 앱으로 관리하므로 로컬 main을 바꾸지 않고 `origin/main`에 태그를 답니다. Fork에서 태그를 만들어 push해도 됩니다. Actions에서 publish 실행 4개가 성공하는지, Releases에 4개가 생겼는지 확인합니다. 각 Release 본문의 배포 실행 링크는 동기화가 패키지 출처를 확인하는 근거입니다.

### 4-2. 패키지 접근 권한

GitHub 프로필 → Packages에서 패키지 4개 각각에 대해 Package settings → Manage Actions access → Add repository로 앱 리포 8개를 추가하고 Role은 Read로 둡니다. 그래야 각 앱 CI가 패키지를 설치할 수 있습니다.

### 4-3. Lightsail 서버 토큰 (workout-memo 첫 동기화 PR을 병합하기 전에만 하면 됨)

1. Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)
   - 이름: `lightsail-read-packages`
   - 만료: 예) 1년
   - 권한: `read:packages` 하나만
2. 서버에 설정합니다.
   ```powershell
   ssh -i ~/.ssh/workout-memo-lightsail ubuntu@<static_ip>
   sudo nano /opt/workout-memo/.env    # 맨 아래에 NODE_AUTH_TOKEN=<발급한 토큰> 추가 후 저장
   ```
3. 만료일을 캘린더에 적어 두세요. 토큰은 서버 `.env`에만 둡니다.

4-1·4-2가 끝나면 알려 주세요. `versions.json`에 패키지 버전 1.0.0을 넣는 PR은 에이전트가 합니다.

## 5. 리포 설정 맞추기 (#22)

9개 리포 모두 Dependabot 취약점 알림과 보안 업데이트가 꺼져 있고, workout-memo(공개)는 브랜치 보호와 secret scanning도 꺼져 있습니다(2026-10-22 확인). 기준, 이유, 명령은 [repo-settings.md](repo-settings.md)의 "맞추는 법"에 있습니다. workout-memo 브랜치 보호는 첫 동기화(#97) 병합 뒤에 설정합니다.

## 6. GitHub App에 Issues 쓰기 권한 추가 (#40)

**왜 필요한가요:** 동기화가 9개 리포에 std-backlog 라벨(우선순위·특성 20개)을 만들거나 고치려면 App에 Issues 쓰기 권한이 있어야 합니다. 3번을 아직 하지 않았다면 3-1 표에 이미 들어 있으니 이 단계는 건너뜁니다.

1. GitHub → Settings → Developer settings → GitHub Apps → `project-standards-sync` → Permissions & events.
2. Repository permissions의 **Issues**를 "Read and write"로 바꾸고 Save changes.
3. Settings → Applications → Installed GitHub Apps → `project-standards-sync`에서 새 권한 요청을 **Accept**합니다. Accept해야 적용됩니다.
4. 다음 `sync` 실행 로그에 리포마다 `라벨 생성 n, 갱신 n, 그대로 n` 줄이 나오면 성공입니다. `라벨 실패 — ... 403`이 나오면 3을 다시 확인하세요.

동기화는 라벨을 만들거나 고치기만 하고 지우지 않습니다. 각 리포에만 있는 라벨과 GitHub 기본 라벨(`bug` 등)은 그대로 남습니다.

## 7. Codex 훅 신뢰와 차단 확인 (#180)

**왜 필요한가요:** Codex는 프로젝트의 훅(`.codex/hooks.json`)을 사용자가 `/hooks`에서 신뢰해야 실행합니다. 신뢰하지 않으면 규칙(`.codex/rules/`)만 남고, 규칙은 `npm --silent install`처럼 옵션을 앞에 둔 형태를 막지 못합니다([agent-guardrails.md](agent-guardrails.md)). 대화형 세션이 필요해서 직접 하셔야 합니다.

1. project-standards 폴더에서 Codex를 엽니다. 프로젝트 `.codex/` 폴더를 신뢰할지 물으면 신뢰합니다.
2. `/hooks`를 입력하고 "패키지 설치 명령인지 확인" 훅을 검토한 뒤 신뢰합니다.
3. Codex에게 `npm --silent install --help`를 실행해 달라고 합니다. "패키지 설치·삭제·실행 명령이라 막았습니다"가 나오면 성공입니다.
4. 같은 방식으로 `npm ls`는 실행되는지 확인합니다.

결과를 #180에 댓글로 남기거나 알려 주시면 이슈를 닫습니다. `.codex/hooks.json`의 훅이 바뀌면 다시 신뢰해야 합니다.

## 8. 작업 PC 점검 (#183)

1을 끝낸 직후에 합니다. 작업 PC가 여러 대면 PC마다 합니다.

```powershell
claude --version    # 2.1.295 이상이어야 함 (낮으면 업데이트)
Test-Path "$env:LOCALAPPDATA\sirloinbh-tools\agents.ps1"    # True
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\sirloinbh-tools\agents.ps1" -Root <project-standards 폴더> status
```

그다음 새로 시작한 Claude Code 세션에서 `npm --silent install --help`가 막히고 `npm ls`는 실행되는지 확인합니다. Claude Code가 2.1.295보다 낮으면 차단 훅이 실패했을 때 명령이 그대로 실행됩니다. 결과(PC 이름, 버전)를 #183에 댓글로 남겨 주세요.

## 9. 리포 보안 설정 켜기와 App 권한 추가 (#261)

**왜 필요한가요:** 리포 11개가 모두 공개라 secret scanning, push protection, CodeQL을 무료로 쓸 수 있습니다. 준수 현황은 이제 세 가지를 모든 리포에 필수로 봅니다(#260). 설정을 바꾸는 권한은 사용자에게만 있습니다.

1. 동기화 App 권한 추가: GitHub → Settings → Developer settings → GitHub Apps → `project-standards-sync` → Permissions & events → Repository permissions의 **Code scanning alerts**를 "Read-only"로 바꾸고 저장합니다. Settings → Applications → Installed GitHub Apps에서 새 권한을 **Accept**합니다.
2. 리포 11개(`project-standards`, `shared-aws-infrastructure`, 앱 8개, `file-control`)마다 secret scanning·push protection과 CodeQL 기본 설정을 켭니다. 명령은 [repo-settings.md](repo-settings.md)의 "맞추는 법"에 있습니다.
3. 켠 뒤 처음 나온 code scanning·secret scanning 알림 **수**를 #261에 댓글로 남겨 주세요(내용은 쓰지 않음). 다음 준수 현황에서 세 항목이 모두 ✓이면 끝입니다.

## 10. Claude API 키를 SSM 한 곳에 넣기 (#266)

**왜 필요한가요:** Claude API 키의 원본을 AWS SSM 한 곳에 두고, 서버와 PC가 거기서 받아 씁니다([ADR-0010](adr/0010-claude-api-key-ssm.md)). 키 발급·결제·AWS 키 만들기는 사용자 계정으로만 할 수 있습니다. **키 값은 채팅이나 문서에 붙여 넣지 마세요.**

1. sirloinbh/shared-aws-infrastructure#8(SSM 파라미터·읽기 전용 IAM 사용자) PR을 병합하고 `terraform apply`합니다.
2. Anthropic Console에서 workspace를 하나 정하고 지출 한도를 겁니다. 그 workspace에서 API 키를 하나 만듭니다.
3. 키를 복사한 상태에서 project-standards 폴더에서 실행합니다:
   ```powershell
   $env:SIRLOINBH_AWS_PROFILE = '<개인 AWS 프로필>'
   Get-Clipboard | node tools/app-secrets.mjs set
   node tools/app-secrets.mjs pull
   node tools/app-secrets.mjs check     # 모두 "있음"이면 성공
   ```
4. AWS 콘솔에서 읽기 전용 IAM 사용자의 액세스 키를 만들고, 서버 `/opt/study-log/.env`에 `SECRETS_AWS_ACCESS_KEY_ID`, `SECRETS_AWS_SECRET_ACCESS_KEY`를 넣습니다. 다음 배포부터 서버가 SSM에서 키를 읽습니다. 그 뒤 서버 `.env`의 `ANTHROPIC_API_KEY` 줄은 지워도 됩니다.
5. 예전 키가 있으면 Console에서 폐기합니다. 끝나면 #266에 "끝"이라고 댓글을 남겨 주세요(값은 쓰지 않음).

## 11. healthchecks.io 알림 켜기 (#286)

**왜 필요한가요:** 앱이 멈추거나 백업·자동 배포가 실패해도 지금은 서버 로그에만 남습니다. 서버가 healthchecks.io로 신호를 보내고, 끊기거나 실패하면 메일이 옵니다(#284). 계정과 메일 설정은 사용자 계정으로만 할 수 있습니다. **신호 주소는 채팅·문서에 붙여 넣지 마세요**(비밀 UUID가 들어 있음).

1. https://healthchecks.io 가입(무료 20개 체크). 알림 받을 메일을 확인합니다.
2. 앱마다 체크를 만듭니다. 이름은 `<앱>-health`처럼 짓고, 주기·유예는 앱 배포 runbook(`docs/runbooks/deploy.md`) "알림" 표대로 합니다. 앱 8개 × 5개는 무료 한도를 넘으므로, 먼저 운영 중인 앱(workout-memo)부터 만듭니다.
3. 서버 `/opt/<앱>/.env`에 체크별 주소를 `HEALTHCHECK_URL_HEALTH=...`처럼 넣습니다.
4. `sudo bash /opt/<앱>/deploy/install-backup.sh`로 health timer를 설치합니다(동기화 PR 반영 뒤).
5. `docker compose stop web`으로 잠깐 멈췄다가 10~15분 안에 메일이 오는지 보고, `docker compose start web`으로 되돌립니다. 결과를 #286에 댓글로 남겨 주세요(주소는 쓰지 않음).

