# Project Standards 에이전트 지침

이 리포지토리는 `sirloinbh` 개인 앱 포트폴리오(앱 8개 + `shared-aws-infrastructure`)의 공통 표준(설정·컨벤션·스킬·프로젝트 고정값)을 관리하는 중앙 리포다.

## 현재 단계: 적용 준비

- 설계는 승인되어 [docs/design.md](docs/design.md)와 [docs/adr/](docs/adr/)가 원본이다. 요구사항 원본은 [docs/bootstrap-prompt.md](docs/bootstrap-prompt.md)다.
- 중앙 골격(레지스트리, 템플릿, 동기화, 공유 패키지, 공통 CI, 준수 현황)은 만들어져 있다. `sync.config.json`의 `maxRollout`이 `1`이라 workout-memo에만 동기화 PR이 열린다(#97, 2026-10-25 사용자 승인).
- 지금은 workout-memo 첫 동기화 PR을 검토·병합하는 단계(#97, #98)다. 나머지 앱 7개(`maxRollout` 2)는 그 뒤다. 단계별 계획은 design.md "12. 단계별 적용 계획"을 따른다.
- 하위 리포 적용이 끝나면(#116) 이 절을 운영 단계 기준으로 고친다.

## 작업 절차

- 요구사항을 이슈로 등록하거나 다음 작업을 고를 때는 [std-backlog](templates/common/skills/std-backlog/SKILL.md) 스킬을 따른다.
- 이슈·브랜치·커밋·PR을 쓸 때는 [std-git-writing](templates/common/skills/std-git-writing/SKILL.md) 스킬과 `.github/`의 이슈·PR 템플릿을 따른다.

1. `sirloinbh/project-standards`에 이슈를 등록한다. 사용자가 지정한 기존 이슈가 있으면 재사용한다.
2. 이슈 번호를 포함한 브랜치를 만든다: `<type>/<issue-number>-<slug>`.
3. 구현·테스트·`docs/changes/<issue-number>-<slug>.md` 기록을 함께 커밋한다.
4. 커밋 전과 PR 생성·갱신 전에 관련 테스트를 실행하고 결과를 docs와 PR에 기록한다.
5. **이 리포의 PR은 에이전트가 병합한다.** `npm run check`가 통과하고 PR 본문을 템플릿대로 쓴 뒤 merge commit으로 병합하고(`pr merge --merge`. 로컬 브랜치는 사용자가 Fork 앱에서 정리하므로 `--delete-branch`를 쓰지 않는다), std-backlog 순서에 따라 다음 이슈를 진행한다. 사용자가 2026-10-22에 정한 규칙이다(#128).
   - 다음은 계속 사용자에게 먼저 확인한다: 하위 리포 PR(앱 리포 main 병합은 곧 운영 배포), `[직접]`·`needs-user` 이슈, 사전 승인 범위 밖의 패키지 설치, 이슈에 "사용자 확인"으로 적힌 결정.
   - 병합 전에 확인해 달라고 PR 본문에 적은 항목이 있으면 병합하지 않고 사용자에게 묻는다.
   - 예외: 에이전트 워커(`tools/agents`)가 하위 리포에서 여는 PR은 그 리포 `.agents.json`의 `autoMerge`를 따른다(기본 `true`, 리포별 값은 [docs/tools.md](docs/tools.md#리포별-자동-병합) 표). 표에서 `false`인 리포는 워커를 도입하는 PR에 `.agents.json`을 함께 넣는다(#184).

질문 답변·추천·읽기 전용 조사는 이슈나 브랜치를 만들지 않는다.

## 검증 명령

외부 npm 패키지 없이 Node 내장 모듈만으로 동작한다. `npm install`은 하지 않는다.

| 명령 | 언제 |
|---|---|
| `npm run check` | 모든 커밋과 PR 전. 테스트, 레지스트리 충돌, 생성 문서·디자인 토큰 최신 여부, 패키지 규칙, 워크플로 검사 |
| `npm run test:agents` | `tools/agents/`를 바꿨을 때 (Windows 경로 검사 포함) |
| `UPDATE_SNAPSHOT=1 npm test` | 하위 리포가 받을 파일 목록이 바뀌었을 때. 스냅샷 변화를 PR에서 함께 리뷰한다 |
| `npm run docs`, `npm run tokens` | 레지스트리·토큰을 바꾼 뒤 생성 문서를 다시 만들 때 |
| `npm run sync:preview` | 하위 리포가 받을 파일을 `.local/sync-preview/`에 미리 볼 때 |

## 원본과 복제본

| 바꿀 것 | 원본 | 복제본 (직접 고치지 않음) |
|---|---|---|
| 하위 리포에 복사되는 파일 | `templates/common/`, `templates/app/`, `templates/infra/`, 기능별 `templates/ui/`·`e2e/`·`vitest/` | 하위 리포의 중앙 관리 파일(동기화 PR로 반영) |
| 공통 스킬 | `templates/common/skills/` | 이 리포의 `.claude/skills/` |
| 이슈·PR 템플릿 | `templates/common/.github/` | 이 리포의 `.github/` 템플릿 |
| 에이전트 차단 설정 | `templates/common/.claude/`, `templates/common/.codex/` | 이 리포의 `.claude/`, `.codex/` |
| 도구 버전, 외부 Action | `versions.json` | — |
| 포트·DB 이름 등 프로젝트 값 | `registry/projects.json` | `docs/projects.md`(생성 문서) |
| 동기화 대상·적용 단계 | `sync.config.json` | — |

동기화 스크립트는 하위 리포만 갱신한다. 이 리포의 복제본은 원본을 고친 뒤 같은 PR에서 그대로 복사한다.

## 동기화와 배포

- **동기화:** 중앙 main에 병합되면 `sync.yml`이 `rollout ≤ maxRollout`인 리포마다 동기화 PR(`chore/standards-sync-*`)을 열거나 갱신한다. GitHub App 변수(`SYNC_APP_ID`)가 없으면 건너뛴다. `maxRollout`은 사용자 승인 후에만 올린다.
- **공유 패키지:** 태그(`<패키지>/v<버전>`) push로만 배포한다(`publish.yml`). 태그 push는 사용자 단계다. 배포 후 `versions.json`의 패키지 버전을 올리는 PR은 에이전트가 한다.
- **준수 현황:** `compliance.yml`이 매일 하위 리포 상태를 모아 `docs/compliance.md`, `docs/env-matrix.md` 갱신 PR을 연다. App 변수가 없으면 건너뛴다.
- **앱 배포:** 앱 리포의 main 병합이 곧 운영 배포다. 하위 리포의 동기화 PR은 사용자가 병합한다.

## 금지 사항

- 기본 `gh`(회사 계정)로 원격 변경을 하지 않는다. 아래 "계정과 보안"의 래퍼를 쓴다.
- 하위 리포에 직접 push하지 않는다. 하위 리포 변경은 각 리포의 이슈·PR 절차를 따른다.
- npm 패키지 설치·삭제·`npx` 실행을 하지 않는다. 사용자가 명시적으로 재확인한 경우만 예외이고, 조건은 [docs/dependency-policy.md](docs/dependency-policy.md)와 [docs/agent-guardrails.md](docs/agent-guardrails.md)를 따른다.
- `.env` 값, 토큰, GitHub App 개인키, Terraform state, 백업을 커밋하거나 docs·PR·로그에 기록하지 않는다.
- `maxRollout`을 올리거나, 패키지 태그를 push하거나, 사용자 단계를 대신하지 않는다.
- 사용자 변경을 덮어쓰지 않는다. 필요한 파일만 명시해서 stage한다.

## 계정과 보안

- GitHub 작업은 개인 계정 `sirloinbh`로 한다. `ghp` 함수 또는 `gh-project.ps1` 래퍼를 쓴다. 위치는 `%LOCALAPPDATA%\sirloinbh-tools\`(#21 이후)이고, 설치 전에는 예전 위치 `%LOCALAPPDATA%\gh-workout-memo\`다([docs/tools.md](docs/tools.md)).
- Git 인증은 리포 로컬 credential helper(`gh-project.ps1 auth git-credential`)가 담당한다. 커밋 작성자는 `~/.gitconfig-personal`이 원격 URL 기준으로 자동 적용한다.

## 응답

- 사용자에게 하는 설명과 문서는 한국어로 쓴다.
