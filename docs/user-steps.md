# 직접 하실 일 (사용자 단계 모음)

에이전트가 대신할 수 없는 단계(비밀값, 원격 계정 설정, 로컬에만 있는 파일)를 모았습니다. 끝낸 항목은 이슈 번호와 함께 채팅으로 알려 주세요. **개인키·토큰 같은 비밀값은 채팅이나 문서에 붙여 넣지 마세요.**

| 순서 | 할 일 | 시간 | 이슈 |
|---|---|---|---|
| 0 | 로컬 `.env` 포트 바꾸기 | 5분 | (#95 후속) |
| 1 | 개인 계정 도구를 새 위치로 설치 | 5분 | #21 |
| 2 | shared-aws-infrastructure 최신화와 Terraform state 이동 | 15분 | #92 |
| 3 | GitHub App 만들기와 Actions 공유 설정 | 10분 | #86 |
| 4 | 공유 패키지 첫 배포와 접근 권한 | 10분 | #88 |
| 5 | 리포 설정 맞추기 (Dependabot, 병합 방식, workout-memo 보안) | 10분 | #22 |
| 6 | (3을 이미 했다면) GitHub App에 Issues 쓰기 권한 추가 | 3분 | #40 |

1–4가 끝나면 첫 동기화(#97: workout-memo, `maxRollout` 1)를 시작할 수 있습니다. 0은 순서와 상관없이 언제든 하면 됩니다.

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

## 2. shared-aws-infrastructure 최신화와 Terraform state 이동 (#92)

**왜 필요한가요:** 인프라 원본을 workout-memo에서 shared-aws-infrastructure로 옮기기 전에 두 가지를 해야 합니다. 원격 push와 Git에 올라가지 않는 파일이라 직접 하셔야 합니다.

- shared-aws-infrastructure가 workout-memo 쪽보다 커밋 3개 뒤처져 있어 이를 맞춥니다.
- 로컬에만 있는 Terraform state를 새 위치로 옮깁니다.

### 2-1. 뒤처진 커밋 3개 반영 (fast-forward push)

```powershell
cd C:\Users\byunghk\Documents\GitHub\workout-memo
git fetch origin; git fetch infrastructure
git subtree split --prefix=infrastructure origin/main
# 마지막 줄이 684542aaf1705c8e6835b7e126a47edf31f53e5c 인지 확인
git push infrastructure 684542aaf1705c8e6835b7e126a47edf31f53e5c:refs/heads/main
```

일반 push라서 이력이 갈라져 있으면 거부됩니다. 2026-10-22에 확인했을 때는 fast-forward로 들어갈 수 있는 상태였습니다.

### 2-2. 새 작업 폴더 만들기 (clone과 개인 계정 인증 설정)

```powershell
cd C:\Users\byunghk\Documents\GitHub
git clone https://github.com/sirloinbh/shared-aws-infrastructure.git
cd shared-aws-infrastructure
git log --oneline -1   # 684542a 이어야 함
```

clone할 때 회사 계정 인증 창이 뜨면 취소하고, `ghp repo clone sirloinbh/shared-aws-infrastructure`로 받습니다. 그다음 개인 계정 인증을 설정합니다.

- 1번(#21)을 이미 했다면:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\sirloinbh-tools\set-credential-helper.ps1" -Repository C:\Users\byunghk\Documents\GitHub\shared-aws-infrastructure
  ```
- 아직이면(예전 도구 위치):
  ```powershell
  git config --local credential.https://github.com.username sirloinbh
  git config --local --add credential.https://github.com.helper ""
  git config --local --add credential.https://github.com.helper "!powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:/Users/byunghk/AppData/Local/gh-workout-memo/gh-project.ps1 auth git-credential"
  ```

### 2-3. state를 리포 밖에 백업

```powershell
$src = "C:\Users\byunghk\Documents\GitHub\workout-memo\infrastructure"
$bak = "$HOME\Backups\terraform-20261022"
New-Item -ItemType Directory -Force $bak | Out-Null
Copy-Item "$src\terraform.tfstate*", "$src\terraform.tfvars" $bak
Get-ChildItem $bak
```

`terraform.tfvars`(개인 AWS 프로필과 계정 ID가 들어 있는 설정)도 Git이 무시하는 파일이라 함께 옮깁니다.

### 2-4. 새 폴더로 복사하고 확인 (apply는 하지 않습니다)

```powershell
$dst = "C:\Users\byunghk\Documents\GitHub\shared-aws-infrastructure"
Copy-Item "$src\terraform.tfstate*", "$src\terraform.tfvars" $dst
cd $dst
git status          # state·tfvars가 목록에 나오지 않아야 함(무시 대상)
terraform init
terraform plan
```

결과가 "No changes. Your infrastructure matches the configuration."이면 성공입니다. 무언가를 바꾸겠다고 나오면 멈추고 알려 주세요.

### 2-5. 마무리

plan 결과가 변경 없음이면 workout-memo 쪽 원본(`infrastructure\terraform.tfstate*`, `terraform.tfvars`)을 지워 원본을 하나로 만듭니다. 백업은 2-3에 있습니다. 그다음 "#92 끝"이라고 알려 주시면 #93(인프라 리포 정비)과 #94(workout-memo에서 infrastructure 제거)를 진행합니다.

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

```powershell
ghp secret set SYNC_APP_PRIVATE_KEY -R sirloinbh/project-standards < "$HOME\Downloads\project-standards-sync.<날짜>.private-key.pem"
ghp variable set SYNC_APP_ID -R sirloinbh/project-standards --body "<App ID 숫자>"
Remove-Item "$HOME\Downloads\project-standards-sync.*.private-key.pem"
```

`.pem` 파일은 등록 직후 지웁니다. 다시 필요하면 새로 만들면 됩니다. 웹에서는 project-standards → Settings → Secrets and variables → Actions에서 등록합니다.

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
cd C:\Users\byunghk\Documents\GitHub\project-standards
git switch main; git pull
git tag eslint-config/v1.0.0
git tag prettier-config/v1.0.0
git tag tsconfig/v1.0.0
git tag design-tokens/v1.0.0
git push origin eslint-config/v1.0.0 prettier-config/v1.0.0 tsconfig/v1.0.0 design-tokens/v1.0.0
```

Actions에서 publish 실행 4개가 성공하는지, Releases에 4개가 생겼는지 확인합니다. 각 Release 본문의 배포 실행 링크는 동기화가 패키지 출처를 확인하는 근거입니다.

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
