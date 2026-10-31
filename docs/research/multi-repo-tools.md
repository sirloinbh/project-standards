# 여러 앱 리포를 다루는 도구 조사 (#255)

2026-10-27 조사. 이 문서는 비교와 권장안이다. 채택 결과는 맨 아래 "결정"에 적고, 적용은 #258에서 추적한다. 조사 중에는 아무것도 설치하지 않았다.

## 지금 상태

- 리포 수: 앱 우산 리포 8개, subtree 배포 리포 24개(`*-frontend`, `*-backend`, `*-db`), shared-aws-infrastructure, project-standards, file-control. 사람이 직접 여는 리포는 11개다.
- 공통 파일은 중앙 동기화 PR로 맞춘다(`docs/design.md`). 앱 리포 main 병합은 곧 운영 배포다.
- 이미 있는 도구:
  - `tools/gh-project.ps1`: sirloinbh 계정 고정
  - `tools/agents`: 리포별 에이전트 워커
  - `tools/dependency-prs.mjs`: 리포 전체 의존성 PR
  - `tools/app-secrets.mjs`: 공용 Claude 키
  - `open-vscode-account-b.cmd`: 개인 계정으로 VS Code 열기
- 앱 리포 이슈는 4곳에 99개(2026-10-27)인데, **우선순위 라벨 이름이 리포마다 다르다.** 예: `P1 높음`(plan-routine, file-control), `우선순위: P1`(study-log), `priority:P2`(workout-memo). 중앙 표준 라벨(`priority/P1` 등, `templates/common/labels.json`)은 동기화로 만들어졌지만, 예전 라벨이 붙은 이슈는 그대로다.
- 이 PC의 다른(회사) 프로젝트는 `.code-workspace`를 쓰지만 sirloinbh 앱에는 없다.
- GitHub CLI 토큰 범위는 `gist`, `read:org`, `repo`, `workflow`다. GitHub Projects를 다루려면 `project` 범위가 더 필요하다.

## 1. 리포 구조

| 방식 | 장점 | 단점 | 판단 |
|---|---|---|---|
| A. 지금 구조 유지 (다중 리포 + 중앙 동기화) | 앱마다 배포·권한·CI가 독립. 이미 동기화·준수 현황·검사가 갖춰짐 | 리포를 넘는 작업(같은 수정 8번)은 동기화 PR로만 한 번에 됨 | **권장** |
| B. 모노레포 (npm workspaces + Turborepo 또는 Nx) | 한 PR로 여러 앱 수정, 빌드 캐시 | 리포 이력·subtree 배포·앱별 자동 배포·공개 범위를 모두 다시 짜야 함. Turborepo·Nx는 새 npm 패키지(설치 정책) | 비권장 |
| C. 하이브리드 (공통 코드만 패키지) | 지금도 `packages/` 4종으로 하고 있음 | — | A에 포함 |

## 2. 리포 일괄 실행

| 방식 | 설치 | 공급망 위험 | 판단 |
|---|---|---|---|
| A. 중앙 `tools/`에 직접 만든 명령 (레지스트리에서 리포 목록을 읽음) | 없음 (Node 내장 모듈) | 없음 | **권장** |
| B. `mani` (Go 단일 바이너리, YAML 설정) | 바이너리 내려받기 | 낮음~중간 (서명·체크섬 확인 필요) | 대안 |
| C. `gita` (Python, pip) | pip | 중간 | 비권장 |
| D. `meta` (npm) | npm 전역 설치 | 높음 (npm 설치 정책) | 비권장 |

A로 만들 명령 예: `node tools/repos.mjs status`(리포마다 브랜치·변경·뒤처진 커밋), `pull`(작업 트리가 깨끗한 리포만 fast-forward), `run -- <명령>`(리포마다 같은 읽기 전용 명령). 리포 목록과 클론 위치는 레지스트리와 상위 폴더 규칙(`docs/tools.md`)을 쓴다.

## 3. VS Code 멀티 루트 작업공간과 확장 프로그램

- **작업공간 파일:** 레지스트리에서 `sirloinbh.code-workspace`를 만들면, 앱 8개와 중앙·인프라 리포를 한 창에서 연다. 개인 계정 터미널 설정(`.vscode/settings.json`)은 폴더마다 그대로 적용된다. 파일은 PC마다 경로가 달라 커밋하지 않고 `.local/`에 만든다.
- **권장 확장 프로그램** (`.vscode/extensions.json`, #247과 같은 파일):

| 확장 | 이유 | 판단 |
|---|---|---|
| ESLint, Prettier, EditorConfig | 이미 쓰는 검사와 같게 편집 | 넣음 (#247) |
| GitHub Pull Requests | 편집기 안에서 PR·이슈 보기 | 권장 |
| Error Lens | 오류를 줄 끝에 바로 표시 | 선택 |
| GitLens | 이력 보기 (무료 기능만) | 선택. 필수 아님 |

확장 프로그램 권장 목록은 설치를 강제하지 않는다. VS Code가 "권장 확장을 설치할까요?"라고 묻기만 한다.

## 4. 이슈·PR 통합 보기

| 방식 | 장점 | 단점 | 판단 |
|---|---|---|---|
| A. GitHub Projects 보드 하나에 앱 리포 이슈 모으기 | 우선순위·상태로 한 화면 정렬. 웹·모바일 | `gh` 토큰에 `project` 범위 추가 필요(사용자 단계). 리포를 넘는 자동 추가는 Projects 자체 워크플로나 중앙 스크립트로 해야 함 | **권장** |
| B. 중앙 명령으로 표 출력 (`tools/dependency-prs.mjs`처럼) | 설치·권한 추가 없음 | 터미널에서만 봄 | A의 보조 |
| 공통 | — | **라벨 이름 통일이 먼저**다. 지금처럼 라벨이 다르면 어느 쪽이든 우선순위로 정렬할 수 없다 | — |

라벨 통일은 각 앱 리포의 예전 우선순위·특성 라벨을 표준 라벨(`priority/P0`~`P4`, `type/*`)로 옮기는 일이다. 중앙 명령이 대응표를 만들고, 사용자 확인 뒤에 리포마다 라벨을 바꾼다. 예전 라벨은 지우지 않는다.

## 5. 개발 보조 도구

| 도구 | 하는 일 | 설치 | 지금 필요성 | 판단 |
|---|---|---|---|---|
| API 목 (MSW) | OpenAPI 계약에서 목 응답을 만들어, 백엔드 없이 프런트 개발·테스트 | 앱마다 npm 개발 의존성(`msw`) | 중간. `features.openapi`·`contract`가 켜진 앱은 workout-memo 하나라 효과가 작음 | 나중에 (#240·#241 결과를 보고) |
| Lighthouse CI | PR마다 접근성·성능 점수 확인. `docs/conventions/ux-audit.md`의 점검을 자동화 | 외부 Action 또는 npm 패키지, CI에 Chrome | 중간. 앱 8개가 같은 UI 컴포넌트를 써서, 한 번 정한 기준을 모두에 적용할 수 있음 | **권장 (workout-memo에서 경고만 내는 시험부터)** |
| Dev Container | 새 PC에서 Node·npm·DB를 한 번에 맞춤 | Docker Desktop + VS Code 확장, 컨테이너 이미지 | 낮음. 작업 PC가 Windows 1~2대이고 버전은 `.nvmrc`·`versions.json`·`npm run check`가 이미 맞춤 | 비권장 (지금은) |

## 권장안 요약

1. 리포 구조는 그대로 둔다(1-A).
2. `tools/repos.mjs`로 리포 일괄 상태·pull·실행 명령을 만든다(2-A).
3. 레지스트리에서 VS Code 작업공간 파일을 만드는 명령을 넣는다. 권장 확장은 #247에 GitHub Pull Requests를 더한다(3).
4. 앱 리포 라벨을 표준 라벨로 통일하고, GitHub Projects 보드 하나에 앱 이슈를 모은다(4-A). 보드를 만들고 토큰에 `project` 범위를 더하는 일은 사용자 단계다.
5. Lighthouse CI를 workout-memo에서 경고만 내는 방식으로 시험한다(5). MSW는 #240·#241 뒤에, Dev Container는 하지 않는다.

## 결정

사용자가 권장안을 모두 고르고, 보류를 권한 MSW와 Dev Container도 적용하기로 했다(2026-10-27). 리포 구조는 지금처럼 다중 리포 + 중앙 동기화를 유지한다.

| 채택 | 적용 이슈 |
|---|---|
| 리포 일괄 상태·pull·실행 명령, VS Code 작업공간 파일 | #276 |
| 권장 확장에 GitHub Pull Requests 추가 | #247 |
| 앱 리포 라벨을 표준 라벨로 통일 | #277 |
| GitHub Projects 보드 만들기와 토큰 `project` 범위 (사용자) | #278 |
| 보드에 앱 리포 이슈 모으기 | #279 |
| Lighthouse CI 시험 (workout-memo, 경고만) | #280 |
| MSW 목 (workout-memo부터) | #281 |
| Dev Container (workout-memo부터) | #282 |

패키지·외부 도구 설치 승인(Lighthouse CI, MSW)은 #245에 모았다.
