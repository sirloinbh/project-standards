# 목표
개인 앱 포트폴리오 전체를 통합 관리하는 중앙 리포지토리 `sirloinbh/project-standards`를 설계하고 생성한다.
- 중앙 main에 병합되면 모든 하위 프로젝트에 **자동으로 동기화 PR**이 열린다. 하위 리포에 직접 push하지 않는다.
- 하위 프로젝트에서 중앙 관리 파일을 수정하면 하위 리포 CI가 실패하고, 중앙 리포에 PR을 여는 방법을 안내한다. 하위에서 중앙으로 변경을 자동으로 보내지는 않는다.
- 1단계 산출물은 **설계 문서와 리포 골격**이다. 하위 리포에 실제 동기화 PR을 여는 일은 사용자 승인 후 진행한다.

# 현재 상황 (사실)
- GitHub 계정: 개인 `sirloinbh`, private 리포. GitHub 작업은 `ghp` 또는 `scripts/gh-project.ps1` 래퍼만 사용하고, 회사 계정 `gh`(byunghKim)는 쓰지 않는다.
- 하위 프로젝트: 앱 8개와 공유 인프라 1개.
  - 앱: workout-memo(기준 프로젝트), study-log, health-log, life-journal, money-ledger, english-study, plan-routine, dev-career-portfolio
  - 각 앱은 우산 모노레포 + `<name>-frontend/-backend/-db` subtree 배포 리포 구조다.
  - 공유 인프라: `shared-aws-infrastructure`(Terraform). 앱과 구조가 다르므로 예외 규칙을 적용한다(아래 참조).
- 공통 스택(workout-memo 기준): React + Vite + TypeScript, React Router, TanStack Query, React Hook Form, Tailwind CSS 4, Express + pg + Zod, PostgreSQL 17, npm workspaces, Docker Compose, GitHub Actions, node:test / Vitest / Playwright.
- 기존 규칙 원본: workout-memo의 `AGENTS.md`, `skills/`(`.claude/skills/`는 `npm run skills:sync`로 만드는 복제본), `shared/contract.ts` → `contract:sync` 패턴, `docs/design-system.md`, `docs/ai-agent-project-setup.md`.
- 작업 흐름: 이슈 → `<type>/<번호>-<slug>` 브랜치 → 구현 + 테스트 + `docs/changes/` 기록 → PR. **PR 병합은 사용자만 한다.** 앱 리포의 main 병합은 곧 운영 배포다.

# 보안 제약 (최우선)
- npm 공급망 공격(Shai-Hulud 계열) 때문에 `npm install/ci/update`, `npx <pkg>`, `pnpm/yarn/bun install`은 사용자가 명시적으로 재확인하기 전까지 실행하지 않는다. 자체 패키지도 예외가 아니다.
- 새 외부 도구를 도입하려면 고정 버전, 릴리스 후 14일 경과, `--ignore-scripts` 조건을 지키고, 도입 전에 게시자·저장소·검증 결과를 보고한다.
- `.env` 값, 토큰, GitHub App 개인키, Terraform state, 백업은 리포·문서·로그에 넣지 않는다. 키 이름과 설명만 다룬다.
- 외부 GitHub Action은 커밋 SHA로 고정한다.

# 배포 메커니즘: A안 + B안 병행

## A안: 공유 설정 npm 패키지
- 대상: 패키지 형태로 `extends`/`import`할 수 있는 설정만 담는다.
  - `@sirloinbh/eslint-config`, `@sirloinbh/prettier-config`, `@sirloinbh/tsconfig`, `[[선택]] @sirloinbh/design-tokens`
- 레지스트리: GitHub Packages(`npm.pkg.github.com`), `@sirloinbh` 스코프, private.
- 패키지 작성 규칙 (공급망 위험 최소화):
  - `dependencies`는 0개로 두고, 필요한 플러그인은 `peerDependencies`로 선언해 하위 프로젝트가 직접 고정한다.
  - `preinstall`, `install`, `postinstall`, `prepare` 스크립트를 금지한다. CI로 검사한다.
  - 정확한 버전으로 고정한다(`^`, `~` 금지). CHANGELOG를 쓰고 변경을 semver로 구분한다.
  - 중앙 리포의 CI에서만 publish한다(태그 트리거). 로컬에서 publish하지 않는다.
- 하위 리포에서 쓰는 방법:
  - `.npmrc`에는 `@sirloinbh:registry=https://npm.pkg.github.com`와 `${NODE_AUTH_TOKEN}` 참조만 둔다. 토큰 값은 커밋하지 않는다.
  - CI와 Docker 빌드에서 인증하는 방법을 설계한다(Docker는 BuildKit secret mount를 쓰고, 이미지 레이어에 토큰을 남기지 않는다).
  - 설치는 사용자 승인 후 `--ignore-scripts`로 한다.
  - 자체 패키지(`@sirloinbh/*`)는 14일 경과 규칙에서 제외한다. 대신 다음 조건을 모두 만족해야 한다:
    - 중앙 리포 CI의 태그 트리거로만 publish된 버전일 것(로컬 publish 금지)
    - 패키지 버전이 중앙 리포의 git 태그와 일치하고, publish한 워크플로 실행 기록을 확인할 수 있을 것
    - 동기화 PR 본문에 해당 버전의 CHANGELOG와 중앙 커밋 SHA를 적을 것
    - 패키지에 설치 스크립트가 없고 `dependencies`가 0개인지 `standards-check`로 다시 검사할 것
  - 자체 패키지가 요구하는 외부 `peerDependencies`(ESLint 플러그인 등)는 기존 규칙(고정 버전, 14일 경과, `--ignore-scripts`, 사전 검증)을 그대로 따른다.
- 패키지 버전 업 배포: 중앙 리포의 동기화 PR이 하위 `package.json`의 버전을 함께 올린다(Renovate/Dependabot 버전 업 PR은 쓰지 않는다). lockfile 재생성과 subtree lockfile 갱신은 PR 체크리스트로 남기고 사용자가 승인한 뒤 수행한다.

## B안: 템플릿 파일 동기화
- 대상: 패키지로 담을 수 없는 파일. 예: `AGENTS.md` 공통부, `skills/`, `.claude/skills/`, `.github/`(워크플로 호출부, 이슈·PR 템플릿), `.editorconfig`, `.gitattributes`, `.nvmrc`, `.gitignore` 공통부, 문서 템플릿.
- 트리거: 중앙 main에 병합되면 GitHub Actions가 대상 리포마다 `chore/standards-sync-<중앙 SHA 앞 7자리>` 브랜치를 만들고 PR을 연다. 같은 리포에 이미 열린 동기화 PR이 있으면 새 PR을 열지 않고 그 PR을 갱신한다.
- 구현: 외부 액션 대신 **중앙 리포에 직접 작성한 스크립트**(Node 내장 모듈만 사용)를 우선 쓴다.
- 인증: **GitHub App** `project-standards-sync`를 만든다.
  - 권한은 Contents: write, Pull requests: write, Metadata: read로 제한한다. 대상 리포에만 설치한다.
  - 개인키는 중앙 리포 secret에만 둔다. 워크플로가 실행될 때마다 1시간짜리 설치 토큰을 발급해 쓴다.
  - 생성 절차와 키 교체 절차를 문서화한다. App 생성과 설치는 사용자가 직접 수행한다.
- 관리 대상 파일 맨 위에 "중앙 관리 파일. 수정은 sirloinbh/project-standards로" 헤더를 붙인다(형식상 가능한 파일만).
- 공통 파일과 프로젝트 고유 파일을 분리한다. 예: `AGENTS.md`(중앙) + `AGENTS.project.md`(프로젝트 고유), `CLAUDE.md`는 둘을 참조.
- 동기화 대상은 우산 리포다. subtree 배포 리포(`-frontend/-backend/-db`)는 기존 subtree push 절차로 반영되는지 확인하고 직접 동기화하지 않는다.

## 하위 리포에서 수정했을 때: 감지와 안내만 한다
- 하위 리포 CI의 `standards-check` 작업이 다음을 검사한다.
  - 관리 파일의 해시가 중앙에서 배포한 버전과 같은지
  - A안 패키지의 버전이 중앙에서 지정한 버전과 같은지
  - 프로젝트 고정값(아래 레지스트리)과 실제 설정이 일치하는지
- 위반이 있으면 실패시키고 다음을 출력한다: 어떤 파일이 다른지, 중앙 리포의 어느 경로를 고쳐야 하는지, 중앙 리포에 이슈와 PR을 여는 명령 예시.
- 하위에서 중앙으로 PR을 자동 생성하거나 파일을 되돌리는 기능은 만들지 않는다.

# 프로젝트 고정값 레지스트리 (프로젝트마다 다르고 서로 겹치면 안 되는 값)
- 원본: 중앙 리포의 `registry/projects.json`(스키마는 `registry/projects.schema.json`). 이 값은 템플릿 동기화로 덮어쓰지 않는다.
- 항목: 프로젝트명, 도메인 설명, 리포 이름(우산 + subtree 3종), 포트(web / db / api / vite / e2e api / e2e web), DB 이름과 테스트 DB 이름, 서비스 도메인·서브도메인, AWS 리소스 이름 접두어, 프로젝트 고유 스킬 이름, 의도적으로 허용한 차이(사유 포함).
- 초기값(현재):

  | 프로젝트 | 도메인 | web / db / api / vite |
  |---|---|---|
  | workout-memo | 운동 | 8088 / 55432 / 3001 / 5173 |
  | study-log | 공부 | 8092 / 55442 / 3012 / 5172 |
  | health-log | 건강 | 8093 / 55443 / 3013 / 5183 |
  | life-journal | 일기 | 8094 / 55444 / 3014 / 5174 |
  | money-ledger | 가계부 | 8095 / 55445 / 3015 / 5175 |
  | english-study | 영어 | 8096 / 55446 / 3016 / 5176 |
  | plan-routine | 루틴 | 8097 / 55447 / 3017 / 5177 |
  | dev-career-portfolio | 커리어 | 8098 / 55448 / 3018 / 5178 |

  나머지 항목은 각 리포의 실제 파일을 읽어서 채우고, 확인하지 못한 값은 비워 둔 채 보고한다.
- 중앙 CI가 하는 일:
  - 모든 프로젝트 사이에서 포트, DB 이름, 도메인, 리포 이름이 겹치는지 검사한다.
  - `docs/projects.md`(전체 프로젝트를 한 표로 보는 개요)를 자동 생성하고, 파일이 오래되면 실패시킨다.
- 템플릿 동기화는 이 값을 변수로 주입한다. 예: `.env.example`의 포트, README 제목.
- 새 프로젝트를 추가하는 절차: 레지스트리에 한 항목 추가 → 충돌 검사 통과 → 스캐폴드 생성 → 첫 동기화 PR.

# 통일 대상
1. **언어·프레임워크**: 위 공통 스택을 "허용 목록 + 신규 프로젝트 기준"으로 문서화한다. 메이저 업그레이드 절차를 포함한다.
2. **도구 버전** (B안): `.nvmrc`, `package.json`의 `packageManager`·`engines`, `.npmrc`의 `engine-strict=true`. Docker 베이스 이미지 태그, PostgreSQL 버전, CI의 Node 버전도 중앙의 `versions.json` 한 곳에서 정의하고 템플릿에 주입한다.
3. **코드 컨벤션** (A안 + B안): ESLint, Prettier, tsconfig는 A안 패키지로, `.editorconfig`는 B안으로 배포한다. 현재 각 프로젝트에 이미 설치된 도구를 기준으로 삼고, 새로 도입하는 도구는 별도 항목으로 표시한다.
4. **Git 컨벤션** (B안): Conventional Commits, 브랜치명 `<type>/<issue>-<slug>`, 이슈·PR 템플릿, `docs/changes/` 기록 규칙, 병합 정책(사용자만 병합), 브랜치 보호 설정 체크리스트.
5. **에이전트 지침·스킬** (B안): `AGENTS.md` 공통부, `skills/` 공통 스킬, `.claude/skills/` 동기화. 프로젝트 고유 스킬(예: `workout-*`)은 레지스트리에 등록하고 동기화 대상에서 제외한다.
6. **디렉토리 구조·라우터**: 표준 디렉토리 트리, React Router 페이지 URL 규칙, Express `routes/` 기능 모듈 구조, `shared/contract.ts` 패턴, OpenAPI 생성 규칙. 기존 리포에는 문서와 `standards-check` 경고(처음에는 실패가 아닌 경고)로 유도한다. 신규 프로젝트용 스캐폴드 템플릿은 `scaffold/`에 따로 둔다.
7. **환경변수 한눈에 보기**: 각 리포의 `.env.example`을 원본으로 하고, 중앙에서 모든 프로젝트의 키·설명·필수 여부·비밀 여부·기본값(비밀이 아닌 것만)·사용 위치를 `docs/env-matrix.md`로 자동 생성한다. 프로젝트 고정값 레지스트리와 서로 맞는지 검사한다.

# 추가 통일 대상
- **CI 공통화**: GitHub Actions reusable workflow(`workflow_call`)로 lint/test/build/e2e/`standards-check`를 만든다. 하위 리포는 중앙 워크플로를 태그나 SHA로 고정해서 호출한다.
- **의존성 정책**: 메이저 버전 통일표를 둔다. Dependabot은 보안 업데이트만 켜고, 자동 버전 업 PR은 끈다. `npm audit`을 정기 실행한다.
- **디자인 토큰**: `theme.css` 토큰과 `components/ui` 기본 규칙을 공유한다. 앱별 브랜드 색은 변수로 덮어쓰기를 허용한다.
- **ADR**: `docs/adr/NNNN-*.md`. 모든 규칙에 근거를 남긴다. 처음 작성할 ADR:
  - A안과 B안의 역할 분담
  - GitHub App을 선택한 이유
  - 하위에서 수정했을 때 감지·안내만 하는 이유
  - 자체 패키지를 14일 규칙에서 제외하고 출처 확인 조건으로 대체한 이유(외부 peerDependencies는 기존 규칙을 유지)
  - shared-aws-infrastructure 예외 범위
- **준수 현황**: 각 리포의 준수 상태(관리 파일 일치, 패키지 버전, 아직 병합되지 않은 동기화 PR과 그 경과 일수)를 `docs/compliance.md`로 생성한다.
- **`.gitattributes`·줄바꿈**: LF를 기본으로 하고, `*.ps1`에 CRLF를 허용할지 결정한다. Windows/PowerShell 환경에서 한글이 깨지지 않도록 UTF-8 규칙을 포함한다.
- **보안 기준선**: secret scanning, `.gitignore` 공통부, 금지 패키지 목록과 IOC 점검 스크립트.
- **공통 운영 문서**: 일일 기록·다음 작업(`docs/daily`, `docs/next-steps`) 형식, 백업/복구 절차, 배포 runbook 템플릿.

# 예외: shared-aws-infrastructure
- 동기화 대상에 포함하되, `sync.config`에서 프로필 `infra`로 구분한다.
- 적용하는 것: Git 컨벤션, 이슈·PR 템플릿, `.editorconfig`, `.gitattributes`, `.gitignore` 공통부, `AGENTS.md` 공통부, 공통 스킬 중 인프라와 관련된 것, 보안 기준선, `standards-check`.
- 제외하는 것: A안 npm 패키지, Node/npm 버전 파일, 디렉토리·라우터 규칙, 앱용 CI(lint/test/e2e).
- 인프라 전용 검사: `terraform fmt -check`, `terraform validate`, 셸 스크립트 `bash -n`.
- 동기화 PR은 코드 파일과 `.tf` 파일을 건드리지 않는다. 인프라 리포 PR은 apply를 일으키지 않는다는 점을 PR 본문에 명시한다.
- 앱 레지스트리의 AWS 리소스 이름과 인프라 리포의 실제 정의가 맞는지 교차 검사한다(가능한 범위에서).

# 산출물 (1단계)
1. `docs/design.md`: 배포 흐름도(A안·B안), 하위 리포의 감지·안내 흐름, 파일 분류표(A안 패키지 / B안 중앙 관리 / 프로젝트 고정값 / 프로젝트 고유 / 스캐폴드 전용), 충돌 처리 규칙.
2. 중앙 리포 디렉토리 구조안. 최소 `packages/`, `templates/`, `registry/`, `scaffold/`, `scripts/`, `.github/workflows/`, `docs/adr/`.
3. `sync.config` 스키마와 9개 대상 리포의 초기값(앱 8개는 `app` 프로필, 인프라는 `infra` 프로필).
4. `registry/projects.json`과 스키마, 충돌 검사 스크립트, `docs/projects.md` 생성 스크립트.
5. 동기화 스크립트, `standards-check` 스크립트, A안 패키지 publish 워크플로, 그리고 각각의 테스트(외부 패키지 없이 `node:test`로 작성).
6. GitHub App 생성·설치·키 교체 절차서(사용자가 직접 수행할 단계를 표시).
7. ADR 묶음과 README(새 프로젝트 추가 절차, 규칙 변경 절차, 하위에서 위반이 감지됐을 때의 대응).
8. 단계별 적용 계획: workout-memo에 먼저 적용 → 나머지 앱 7개 → shared-aws-infrastructure 순서로 진행하고, 리포마다 이슈와 PR을 만든다.

# 작업 방식
- 바로 만들지 말고, 먼저 설계안과 남은 질문 목록을 제시하고 승인을 받는다.
- 규칙을 정할 때는 workout-memo의 현재 파일을 근거로 든다. 프로젝트 사이에 차이가 있으면 표로 보고하고, "통일 대상"인지 "레지스트리 고정값"인지 분류를 제안한다.
- 설치되지 않은 도구의 명령을 실행 가능한 것처럼 적지 않는다.
- 응답과 문서는 한국어로 쓴다.
