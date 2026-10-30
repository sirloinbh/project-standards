# GitHub App 만들기·설치·키 교체

동기화 PR을 여는 GitHub App `project-standards-sync`의 절차다. 결정 근거는 [ADR-0002](adr/0002-github-app-for-sync.md)에 있다. **[사용자]** 표시가 있는 단계는 사용자가 GitHub 화면에서 직접 한다. 에이전트는 이 단계를 대신하지 않는다.

## 만들 것 한눈에 보기

| 항목 | 값 |
|---|---|
| App 이름 | `project-standards-sync` |
| 소유자 | 개인 계정 `sirloinbh` |
| 설치 범위 | 아래 10개 리포만 (All repositories 선택 금지) |
| 개인키 보관 | 중앙 리포 Actions secret `SYNC_APP_PRIVATE_KEY` |
| App ID 보관 | 중앙 리포 Actions variable `SYNC_APP_ID` |

설치할 리포: `project-standards`, `workout-memo`, `study-log`, `health-log`, `life-journal`, `money-ledger`, `cert-manager`, `plan-routine`, `dev-career-portfolio`, `shared-aws-infrastructure`

### Repository permissions

| 권한 | 수준 | 쓰는 곳 |
|---|---|---|
| Contents | Read and write | 동기화 브랜치에 커밋 |
| Pull requests | Read and write | 동기화 PR 생성·갱신 |
| Workflows | Read and write | `.github/workflows/ci.yml` 동기화. 이 권한이 없으면 GitHub가 push를 거부한다 |
| Metadata | Read-only | 기본값 (필수) |
| Administration | Read-only | 준수 현황에서 브랜치 보호·병합 설정 확인 (#22) |
| Secrets | Read-only | 준수 현황에서 secret **이름**만 확인. 값은 읽을 수 없다 (#22) |
| Variables | Read-only | 준수 현황에서 variable 이름 확인 (#22) |
| Code scanning alerts | Read-only | 준수 현황에서 CodeQL 기본 설정이 켜졌는지 확인 (#260). 알림 내용은 읽지 않는다 |
| Issues | Read and write | 이슈 라벨 생성·갱신(`templates/common/labels.json`). 라벨을 지우지 않는다 (#40) |

나머지 권한은 모두 "No access"로 둔다. 이미 App을 만들었다면 아래 "권한을 바꿀 때"대로 Issues 권한과 Code scanning alerts 권한을 추가한다.

Actions 권한은 주지 않는다. 동기화가 공유 패키지의 배포 기록(Release와 `publish.yml` 실행)을 확인할 때는 App 토큰 대신 `sync.yml`의 `GITHUB_TOKEN`(`actions: read`)으로 중앙 리포만 읽는다(#205).

## 1. App 만들기 [사용자]

1. GitHub에서 개인 계정 `sirloinbh`로 로그인했는지 확인한다.
2. Settings → Developer settings → GitHub Apps → **New GitHub App**.
3. 입력:
   - GitHub App name: `project-standards-sync`
   - Homepage URL: `https://github.com/sirloinbh/project-standards`
   - Webhook: **Active 체크 해제** (이 App은 이벤트를 받지 않는다)
   - Repository permissions: 위 표대로
   - Where can this GitHub App be installed?: **Only on this account**
4. **Create GitHub App**을 누른다.
5. 만들어진 화면의 **App ID**를 적어 둔다(숫자, 비밀값 아님).

## 2. 개인키 만들기와 등록 [사용자]

1. App 설정 화면 아래쪽 Private keys → **Generate a private key**. `.pem` 파일이 내려받아진다.
2. 중앙 리포 `sirloinbh/project-standards` → Settings → Secrets and variables → Actions:
   - **Secrets** 탭 → New repository secret: 이름 `SYNC_APP_PRIVATE_KEY`, 값은 `.pem` 파일 내용 전체(`-----BEGIN` 줄부터 `END` 줄까지)
   - **Variables** 탭 → New repository variable: 이름 `SYNC_APP_ID`, 값은 1단계의 App ID
3. 내려받은 `.pem` 파일을 **삭제**한다. 리포·문서·채팅·로그 어디에도 붙여 넣지 않는다. 다시 필요하면 새 키를 만든다.

## 3. 설치 [사용자]

1. App 설정 화면 → Install App → `sirloinbh` 옆 **Install**.
2. **Only select repositories**를 고르고 위 10개 리포를 선택한다.
3. 새 프로젝트 리포를 만들면 여기서 그 리포를 추가한다(README의 "새 프로젝트 추가" 참고).

## 4. 하위 리포가 중앙 CI를 불러 쓰게 허용 [사용자]

중앙 리포가 private이라서, 하위 리포가 중앙의 reusable workflow를 호출하려면 다음 설정이 필요하다.

1. `sirloinbh/project-standards` → Settings → Actions → General.
2. **Access** 항목에서 "Accessible from repositories owned by the user 'sirloinbh'"를 선택하고 Save.

## 5. 동작 확인

1. **[사용자]** 중앙 리포 Actions 탭 → `sync` 워크플로 → **Run workflow**(수동 실행). `sync.config.json`의 `maxRollout`이 0이면 PR은 열리지 않고 토큰 발급과 계획 계산만 한다.
2. 실행 로그에서 "설치 토큰 발급" 단계가 성공했는지 확인한다. 로그에 토큰 값이 나오지 않아야 한다.
3. 실패하면 다음을 확인한다: App ID 오타, `.pem` 전체가 secret에 들어갔는지, App이 해당 리포에 설치됐는지, 권한 표와 같은지.
4. `maxRollout` 이하 대상이 있으면 리포마다 `라벨 생성 n, 갱신 n, 그대로 n` 줄이 나온다. `라벨 실패 — ... 403`이면 Issues 권한이 없거나 아직 승인(Accept)되지 않은 것이다. 이때도 동기화 PR은 열리고, 워크플로는 실패로 끝난다.

라벨 변경을 미리 보려면 대상 리포의 라벨을 내보내 dry-run에 넘긴다. 결과는 `plan.json`의 `labels`와 콘솔 줄에 나온다.

```powershell
ghp label list -R sirloinbh/study-log --json name,color,description --limit 200 | Out-File -Encoding utf8 .local/study-log-labels.json
node scripts/sync.mjs --dry-run --out .local/sync-preview --target sirloinbh/study-log --labels-from study-log=.local/study-log-labels.json
```

## 키 교체 [사용자]

다음 경우에 교체한다: 1년마다, 키가 노출됐을 가능성이 있을 때, 관리하던 PC를 바꿀 때.

1. App 설정 → Private keys → **Generate a private key**로 새 키를 만든다. 기존 키는 아직 지우지 않는다.
2. 중앙 리포 secret `SYNC_APP_PRIVATE_KEY`를 새 키 내용으로 **Update**한다.
3. `sync` 워크플로를 수동 실행해 토큰 발급이 성공하는지 확인한다.
4. 성공하면 App 설정에서 **이전 키를 Delete**한다. 실패하면 secret을 이전 키로 되돌리고 원인을 찾는다.
5. 내려받은 새 `.pem` 파일을 삭제한다.
6. 교체 날짜만 `docs/changes/`의 작업 기록이나 이슈에 남긴다. 키 내용·지문은 남기지 않는다.

키가 노출됐다고 의심되면 순서를 바꾼다. **이전 키를 먼저 Delete**하고(그 사이 동기화는 멈춘다), 그다음 1–3단계를 한다.

## 권한을 바꿀 때

1. 중앙 리포에 이슈를 열고 ADR-0002와 이 문서의 권한 표를 함께 고친다.
2. **[사용자]** App 설정 → Permissions에서 권한을 바꾼다.
3. **[사용자]** GitHub가 설치된 계정에 권한 승인 요청을 보낸다. Settings → Applications → Installed GitHub Apps → `project-standards-sync`에서 새 권한을 **Accept**해야 적용된다.
