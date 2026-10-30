# project-standards 설계

- 상태: 초안 (이슈 #1). 이 문서가 병합되면 골격 작업을 별도 이슈로 시작한다.
- 요구사항 원본: [bootstrap-prompt.md](bootstrap-prompt.md)
- 결정 근거: [docs/adr/](adr/)

## 1. 조사 결과 (2026-10-22, 로컬 리포 기준)

### 1.1 8개 앱이 이미 같은 것

| 항목 | 값 | 근거 파일 |
|---|---|---|
| Node / npm | `24.21.0` / `npm@11.19.0` | `.nvmrc`, `.node-version`, `package.json`의 `packageManager`·`engines` |
| `.npmrc` | `engine-strict=true`, `save-exact=true` | 8개 동일 |
| 동일 파일 | `.editorconfig`, `.gitattributes`, `prettier.config.mjs`, `eslint.config.mjs`, `frontend/tsconfig.json`, `backend/tsconfig.json` | 해시 비교 |
| Docker 이미지 | `node:24.21.0-alpine`, `nginx:1.27-alpine`, `postgres:17-alpine` | Dockerfile, `compose.yaml`, `ci.yml` |
| 줄바꿈 | `* text=auto eol=lf`, `*.ps1 text eol=crlf` | `.gitattributes` |
| 린트 도구 | `eslint 10.12.0`, `@eslint/js 10.0.1`, `typescript-eslint 8.71.2`, `globals 16.5.0`, `eslint-plugin-react-hooks 7.1.1`, `eslint-config-prettier 10.1.8`, `prettier 3.9.10` | 루트 `devDependencies` |
| subtree 리포 이름 | `<name>-frontend`, `<name>-backend`, `<name>-db` | `git remote` |

### 1.2 차이와 문제

| # | 발견 | 처리 |
|---|---|---|
| D1 | `shared-aws-infrastructure`의 원본이 `workout-memo/infrastructure/`이고 subtree로 내보낸다. Terraform state는 로컬 파일(`infrastructure/terraform.tfstate`, gitignore됨)이고 remote backend가 없다. | 독립 원본으로 승격 (ADR-0005, 9장) |
| D2 | 포트 충돌: workout-memo vite는 포트를 지정하지 않아 기본값 5173이고 health-log vite도 5173이다. workout-memo e2e web 5174는 life-journal vite 5174와 겹친다. 요구사항 표의 health-log vite 5183은 실제 값과 다르다. | 포트 전체 재배정 (ADR-0006, 6장) |
| D3 | `frontend/`, `backend/`에 각자 `package-lock.json`이 있고 Docker 빌드는 각 폴더에서 `npm ci`를 실행한다. 운영 서버(Lightsail)도 `docker compose build`로 이미지를 빌드한다. | tsconfig·design-tokens 패키지 인증 경로 설계 (4.3) |
| D4 | React Router, TanStack Query, RHF, Tailwind, Playwright는 workout-memo에만 있다. 나머지 7개는 react·vite·lucide 골격이다. | 스택은 "허용 목록 + 신규 기준"으로 문서화, 구조 규칙은 경고 |
| D5 | `save-exact=true`인데 `^` 범위가 남아 있다(`concurrently`, `react`, `vite`, `typescript`, `express`, `pg`, `zod`, `tsx`, `lucide-react`, `@types/*`). | 첫 동기화 PR에서 lockfile에 설치된 버전으로 고정 (8.3) |
| D6 | 외부 Action을 태그로 고정한다(`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `hashicorp/setup-terraform@v3`). | `versions.json`에 SHA로 고정하고 템플릿에 주입 |
| D7 | `ci.yml`은 8개 모두 다르다. 7개 앱은 DB 이름만 다르고 workout-memo는 `db:migrate`, e2e, terraform job이 더 있다. | reusable workflow + 호출부 템플릿 |
| D8 | 스킬 이름 체계(`<proj>-foundation/implementation/testing`)는 같지만, 프로젝트 이름을 정규화해도 내용이 다르다. | 공통부를 `std-*`로 추출, 기존 스킬은 고유 스킬로 남김 |
| D9 | `.gitignore`, `.prettierignore`는 workout-memo에만 Playwright·OpenAPI 줄이 더 있다. | 공통부 + 프로젝트 구간으로 분리 |
| D10 | DB 이름: workout, study, health, journal, money, cert, plan, career. CI는 같은 DB를 테스트에도 쓴다. | 레지스트리 고정값, 테스트 DB는 `<name>_test` |
| D11 | 이 PC에서 TCP 50000–50059가 예약되어 있고, 55536은 Brother iPrint&Scan이 사용 중이다. 55xxx는 Windows·Linux 임시 포트 범위 안이다. | DB 포트를 임시 포트 범위 밖으로 이동 (6장) |

## 2. 핵심 결정

| 결정 | 내용 | ADR |
|---|---|---|
| A안 패키지 | `@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `design-tokens` 4개 모두 1단계에 포함한다 | 0001, 0004 |
| B안 동기화 | 하위 리포의 `.standards/manifest.json`이 관리 파일·해시·패키지 버전·중앙 SHA의 기준이다 | 0001 |
| 인증 | GitHub App `project-standards-sync`, 실행마다 1시간 설치 토큰 | 0002 |
| 하위 수정 | 감지와 안내만 한다. 되돌리기·역방향 PR은 만들지 않는다 | 0003 |
| standards-check | 검사 스크립트를 하위 리포에 복사한다(`.standards/check.mjs`, 관리 파일) | 0003 |
| 인프라 | `shared-aws-infrastructure`를 독립 원본으로 승격하고 `infra` 프로필을 적용한다 | 0005 |
| 포트 | 슬롯 번호 기반 공식으로 전체 재배정한다 | 0006 |
| 스킬 | 공통 스킬은 `std-foundation`, `std-implementation`, `std-testing`. 기존 `<proj>-*`는 고유 스킬이다 | — |

## 3. 중앙 리포 구조

```
project-standards/
├─ AGENTS.md  CLAUDE.md  README.md
├─ versions.json                  # Node, npm, Docker 이미지, PostgreSQL, CI Node, Action SHA, A안 패키지 버전
├─ sync.config.json               # 대상 리포와 프로필
├─ sync.config.schema.json
├─ registry/
│  ├─ projects.json               # 프로젝트 고정값 원본 (동기화로 덮어쓰지 않음)
│  ├─ projects.schema.json
│  ├─ platform.json               # 포트 체계, 예약 포트, 루트 도메인, AWS 공통값
│  └─ platform.schema.json
├─ packages/
│  ├─ eslint-config/              # 각 패키지: package.json, CHANGELOG.md, README.md, 소스
│  ├─ prettier-config/
│  ├─ tsconfig/
│  └─ design-tokens/
├─ templates/
│  ├─ common/                     # app·infra 공통
│  ├─ app/
│  └─ infra/
├─ scaffold/app/                  # 신규 프로젝트 전용 골격
├─ scripts/
│  ├─ lib/                        # render, hash, manifest, registry, github-app(JWT·설치 토큰), github-api
│  ├─ sync.mjs
│  ├─ standards-check.mjs         # 하위 리포 .standards/check.mjs의 원본
│  ├─ registry-check.mjs
│  ├─ gen-docs.mjs                # docs/projects.md, versions.md, design-tokens.md (--check)
│  ├─ compliance.mjs              # docs/compliance.md, docs/env-matrix.md
│  ├─ package-guard.mjs
│  ├─ ioc-scan.mjs
│  └─ test/*.test.mjs             # node:test
├─ .github/
│  ├─ ISSUE_TEMPLATE/  pull_request_template.md
│  └─ workflows/
│     ├─ ci.yml                   # 중앙 자체 검증
│     ├─ sync.yml                 # main push → 동기화 PR
│     ├─ publish.yml              # 패키지 태그 → GitHub Packages
│     ├─ compliance.yml           # 매일 → 준수 현황 갱신 PR
│     ├─ reusable-app-ci.yml      # workflow_call
│     └─ reusable-infra-ci.yml    # workflow_call
└─ docs/
   ├─ design.md  projects.md  versions.md  env-matrix.md  compliance.md
   ├─ github-app.md               # App 생성·설치·키 교체 ([사용자] 단계 표시)
   ├─ stack.md                    # 허용 목록, 신규 기준, 메이저 업그레이드 절차
   ├─ dependency-policy.md        # 버전 원본 안내, 한 앱만 쓰는 패키지의 메이저 표, 외부 도구 도입 절차
   ├─ git-conventions.md  directory-rules.md  design-system.md  env-conventions.md
   ├─ runbooks/                   # 배포, 백업·복구, daily·next-steps 형식
   ├─ changes/
   └─ adr/
```

중앙 스크립트는 Node 내장 모듈만 쓰고 테스트는 `node --test`로 실행한다. 중앙 리포는 1단계에서 `node_modules` 없이 동작해야 한다.

## 4. A안: 공유 설정 패키지

### 4.1 패키지 목록

| 패키지 | 내용 | peerDependencies | 사용하는 곳 |
|---|---|---|---|
| `@sirloinbh/eslint-config` | `createConfig(plugins, options)`를 export하는 팩토리. 현재 `eslint.config.mjs` 규칙과 같다 | `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`, `eslint-config-prettier` (현재 설치 버전 그대로) | 루트 |
| `@sirloinbh/prettier-config` | 앱 `prettier.config.mjs`가 불러 쓰는 공통 옵션 JSON | `prettier` | 루트 |
| `@sirloinbh/tsconfig` | `base.json`, `react-app.json`, `node-api.json` | `typescript` | `frontend/`, `backend/` |
| `@sirloinbh/design-tokens` | `tokens.css`(`:root` 변수, Tailwind 불필요), `tailwind.css`(`@theme static`), 브랜드 변수 목록 | 없음 | `frontend/` |

- ESLint 설정은 팩토리 방식이다. 하위 `eslint.config.mjs`가 peer 플러그인을 직접 import해서 넘긴다. 이렇게 하면 패키지가 다른 모듈을 import하지 않으므로, 중앙 테스트를 스텁으로 돌릴 수 있고 의존성 해석 문제도 없다.
- design-tokens의 기본값은 workout-memo `frontend/src/theme.css`의 의미 토큰(ink, surface, line, danger, radius, shadow)이다. 앱별 브랜드 색(`--color-primary`, `--color-on-primary`, `--color-accent`, `--color-focus`)은 각 앱이 덮어쓴다. Tailwind가 없는 앱은 `tokens.css`만 쓴다.

### 4.2 작성 규칙과 검사

`package-guard.mjs`가 중앙 CI와 publish 직전에 다음을 검사한다. 하위 `standards-check`도 설치된 패키지를 대상으로 같은 검사를 한 번 더 한다.

- `dependencies` 0개
- `preinstall`, `install`, `postinstall`, `prepare` 스크립트 없음
- `version`은 정확한 semver, `peerDependencies`는 정확한 버전
- `CHANGELOG.md`에 해당 버전 항목이 있음
- `files` 필드로 배포 파일을 제한함

### 4.3 publish와 인증

```
packages/<pkg> 변경 PR (버전·CHANGELOG 포함) → 사용자 병합
  → [사용자] 태그 push: <pkg>/v<version>  예) eslint-config/v1.0.0
  → publish.yml: package-guard → 태그와 version 일치 확인 → npm publish (GITHUB_TOKEN packages:write)
                 → 같은 태그로 GitHub Release 생성, 본문에 워크플로 실행 URL과 커밋 SHA 기록
  → versions.json의 packages 갱신 PR → 병합 → B안 sync가 하위 package.json 버전을 올리는 PR 생성
```

| 위치 | 인증 방법 |
|---|---|
| `.npmrc` (루트, `frontend/`, `backend/` — 모두 관리 파일) | `@sirloinbh:registry=https://npm.pkg.github.com`, `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`, `engine-strict=true`, `save-exact=true`, `ignore-scripts=true` |
| 하위 리포 CI | `permissions: packages: read`. `GITHUB_TOKEN`을 `NODE_AUTH_TOKEN`으로 넘긴다. 각 패키지의 "Manage Actions access"에 리포를 추가하는 것은 [사용자] 단계다 |
| Docker 빌드 | `RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" npm ci --ignore-scripts`. ARG·ENV로 토큰을 넘기지 않는다. `compose.yaml`은 `build.secrets`와 최상위 `secrets.npm_token.environment: NODE_AUTH_TOKEN`을 쓴다 |
| 운영 서버 (Lightsail) | 서버 `.env`에 `NODE_AUTH_TOKEN`(classic PAT, `read:packages` 단일 권한)을 둔다. 발급과 교체는 [사용자] 단계이고 `docs/runbooks/`에 기록한다 |
| 로컬 | 사용자 환경변수 `NODE_AUTH_TOKEN`. 설치는 사용자 승인 후 진행한다 |

- `.npmrc`의 `ignore-scripts=true`는 모든 설치에 `--ignore-scripts`를 강제한다. npm 7 이상에서는 `npm run <script>`를 직접 실행하는 데는 영향이 없고 pre/post 훅만 막는다. 현재 8개 리포에 pre/post 스크립트는 없다.
- 자체 패키지는 14일 규칙에서 제외한다. 대신 sync가 PR을 열기 전에 GitHub API로 확인한다: 버전과 태그가 일치하는지, Release에 publish 실행 기록이 있는지, 그 실행이 `publish.yml`이고 성공했는지. 확인한 결과는 PR 본문에 적는다(ADR-0004).

## 5. B안: 템플릿 파일 동기화

### 5.1 파일 분류표

| 분류 | 파일 | 하위에서 수정하면 |
|---|---|---|
| A안 패키지 | ESLint·Prettier·tsconfig·디자인 토큰 내용 | 설치 버전이 manifest와 다르면 실패 |
| B안 전체 관리 | `.editorconfig`, `.gitattributes`, `.nvmrc`, `.node-version`, `.npmrc`(루트·`frontend/`·`backend/`), `eslint.config.mjs`, `prettier.config.mjs`, `frontend/tsconfig.json`, `backend/tsconfig.json`, `AGENTS.md`, `CLAUDE.md`, `skills/std-*`, `.claude/skills/std-*`, `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.standards/check.mjs`, `.standards/lockfiles.mjs`, `scripts/claude-skills.mjs`, `frontend/Dockerfile`, `backend/Dockerfile`, `frontend/nginx.conf`, `backend/src/standard/http.ts`, 공통 UI(`features.ui`: `frontend/src/components/ui/`, `frontend/src/lib/`의 공통 도우미, `frontend/src/health.ts`) | 해시가 다르면 실패 |
| B안 구간 관리 | `.gitignore`, `.prettierignore`, `.env.example`: `# --- project ---` 줄 위가 중앙 구간, 아래가 프로젝트 구간 | 중앙 구간 해시만 비교 |
| B안 필드 관리 | `package.json`(루트·`frontend/`·`backend/`)의 `packageManager`, `engines`, `@sirloinbh/*` 버전, 앱 공통 의존성 42개(`versions.json` `dependencies`), `standards:check`·`lockfiles:sync` 스크립트 | 필드만 비교 |
| 프로젝트 고정값 | 포트, DB 이름, 리포 이름, 도메인, AWS 접두어 | `compose.yaml`, `vite.config.ts`, `playwright.config.ts`, `backend/src/server.ts`, `frontend/nginx.conf`, Dockerfile `EXPOSE`의 실제 값이 레지스트리와 다르면 실패 |
| 프로젝트 고유 | `AGENTS.project.md`, `skills/<proj>-*`, 앱 코드, `compose.yaml`(빌드 secret 설정은 검사), `docs/changes/` | 검사하지 않음 |
| 하위 lockfile | `frontend/package-lock.json`, `backend/package-lock.json` | 루트 `package-lock.json`과 설치 버전이 다르면 실패 ([의존성 정책](dependency-policy.md#하위-lockfile-frontend-backend)) |
| 스캐폴드 전용 | `scaffold/app/**` | 기존 리포에는 경고만 (`directory-rules`) |
| 중앙 도구 | `tools/**`(계정 도구, 로컬 에이전트 워커 `tools/agents/`) | 하위 리포에 복사하지 않는다. PC에 한 번 설치하고 대상 리포를 지정해 실행한다(#19, #165) |
| 리포 에이전트 설정 | `.agents.json`(에이전트 워커를 쓰는 리포만) | 검사하지 않음. 형식은 워커가 실행할 때 검사한다([tools.md](tools.md#로컬-에이전트-워커-toolsagents)) |

포트만 다르고 8개 앱에서 같았던 Docker 파일은 B안 전체 관리로 옮겼다(#6). 템플릿에 주입하는 값은 다음과 같다.

| 파일 | 주입 변수 |
|---|---|
| `frontend/Dockerfile` | `versions.images.node`, `versions.images.nginx`, `versions.npm` |
| `backend/Dockerfile` | `versions.images.node`, `versions.npm`, `project.ports.api` |
| `frontend/nginx.conf` | `project.ports.api` |

두 Dockerfile은 패키지 인증 토큰을 BuildKit secret(`npm_token`)으로만 받는다. 그래서 `compose.yaml`의 각 서비스 `build`에 `secrets: [npm_token]`이 있어야 하고, 최상위 `secrets.npm_token.environment: NODE_AUTH_TOKEN`이 있어야 한다. standards-check가 이를 확인한다.

- 헤더 문구는 `중앙 관리 파일. 수정은 sirloinbh/project-standards의 templates/<경로>에서`다. 주석을 쓸 수 있는 파일은 첫 줄에 `#`, `//`, `<!-- -->`로 넣고, `SKILL.md`는 frontmatter 바로 아래에 넣는다. JSON, `.nvmrc`, `.node-version`은 헤더 없이 manifest로만 관리한다. `.ps1`은 Windows PowerShell 5.1이 BOM 없는 파일을 ANSI로 읽으므로 ASCII 문구 `Managed file. Edit it in sirloinbh/project-standards templates/<경로>/`를 쓴다(#213).
- `AGENTS.md`(중앙)는 첫 절에서 `AGENTS.project.md`를 반드시 읽도록 지시한다. Codex는 `AGENTS.md`만 자동으로 읽기 때문이다. `CLAUDE.md`(중앙)는 두 파일을 모두 참조한다.
- 템플릿 변수는 `{{project.name}}`, `{{ports.web}}`, `{{versions.node}}`, `{{actions.checkout}}` 같은 형식이다. 정의되지 않은 변수가 남으면 렌더링이 실패한다.

### 5.2 manifest

```jsonc
// 하위 리포 .standards/manifest.json (sync가 생성. 직접 수정 금지)
{
  "centralSha": "f8cec0b…",
  "profile": "app",
  "project": "workout-memo",
  "files": {
    ".editorconfig": { "mode": "full", "sha256": "…" },
    ".gitignore": { "mode": "section", "sha256": "…" },
    "package.json": { "mode": "fields", "fields": { "packageManager": "npm@11.19.0", "engines": { "node": "24.21.0", "npm": "11.19.0" } } }
  },
  "packages": { "@sirloinbh/eslint-config": "1.0.0", "@sirloinbh/tsconfig": "1.0.0" },
  "registry": { "ports": { "web": 8101, "api": 3101, "e2eApi": 3201, "vite": 5201, "e2eWeb": 5301, "db": 15401 }, "db": { "name": "workout", "testName": "workout_test" } }
}
```

해시는 LF로 정규화한 내용의 SHA-256이다. Windows에서 체크아웃해도 결과가 같다.

### 5.3 동기화 흐름

```
중앙 main push
  └─ sync.yml (concurrency: sync, 취소 없음)
      ├─ 중앙 테스트, registry-check 통과 확인
      ├─ App JWT → 대상 리포별 설치 토큰
      └─ sync.config의 targets 중 rollout ≤ maxRollout인 리포마다:
          ├─ 프로필 템플릿 렌더링 (registry·platform·versions 주입)
          ├─ 레지스트리 allowedDifferences 경로는 건너뜀
          ├─ 자체 패키지 출처 확인 (4.3)
          ├─ 하위 main 기준으로 변경 계산. 변경이 없으면 종료
          ├─ 열린 동기화 PR이 있으면: 그 브랜치를 하위 main + 렌더링 결과로 다시 만들어 force-push하고, 제목과 본문을 최신 SHA로 갱신
          │  없으면: chore/standards-sync-<중앙 SHA 7자리> 브랜치를 만들고 PR 생성
          └─ PR 본문: 중앙 SHA·비교 링크, 변경 파일 표, 패키지 CHANGELOG 발췌·Release 링크,
                      체크리스트(lockfile 갱신, subtree push, "병합 = 운영 배포"), infra 프로필이면 "apply 없음" 문구
```

- 커밋은 GitHub API(Git Data API)로 만든다. 러너에서 하위 리포를 clone하지 않으므로 하위 리포의 훅이나 스크립트가 실행되지 않는다.
- 동기화 대상은 우산 리포뿐이다. `frontend/.npmrc`처럼 subtree 경로 안의 관리 파일은 사용자가 기존 subtree push 절차를 실행할 때 각 배포 리포로 반영된다.
- `maxRollout`의 초기값은 0이다. 사용자 승인 없이는 실제 PR이 열리지 않는다.

### 5.4 sync.config 스키마와 초기값

```jsonc
{
  "$schema": "./sync.config.schema.json",
  "maxRollout": 0,
  "profiles": {
    "app": {
      "templates": ["common", "app"],
      "packages": ["eslint-config", "prettier-config", "tsconfig", "design-tokens"],
      "ci": "reusable-app-ci.yml"
    },
    "infra": {
      "templates": ["common", "infra"],
      "packages": [],
      "ci": "reusable-infra-ci.yml",
      "neverTouch": ["**/*.tf", "**/*.tfvars", "**/*.tfvars.*", "**/*.sh", ".terraform.lock.hcl"]
    }
  },
  "targets": [
    { "repo": "sirloinbh/workout-memo",              "profile": "app",   "project": "workout-memo",         "rollout": 1 },
    { "repo": "sirloinbh/study-log",                 "profile": "app",   "project": "study-log",            "rollout": 2 },
    { "repo": "sirloinbh/health-log",                "profile": "app",   "project": "health-log",           "rollout": 2 },
    { "repo": "sirloinbh/life-journal",              "profile": "app",   "project": "life-journal",         "rollout": 2 },
    { "repo": "sirloinbh/money-ledger",              "profile": "app",   "project": "money-ledger",         "rollout": 2 },
    { "repo": "sirloinbh/cert-manager",              "profile": "app",   "project": "cert-manager",         "rollout": 2 },
    { "repo": "sirloinbh/plan-routine",              "profile": "app",   "project": "plan-routine",         "rollout": 2 },
    { "repo": "sirloinbh/dev-career-portfolio",      "profile": "app",   "project": "dev-career-portfolio", "rollout": 2 },
    { "repo": "sirloinbh/shared-aws-infrastructure", "profile": "infra", "project": null,                   "rollout": 3 }
  ]
}
```

스키마 규칙: `repo`는 `sirloinbh/` 접두어로 시작하고 중복되지 않는다. `app` 프로필은 `project`가 registry에 있어야 하고, `infra` 프로필은 `project`가 `null`이다. `rollout`은 1 이상의 정수다.

## 6. 프로젝트 고정값 레지스트리

### 6.1 포트 체계 (ADR-0006)

프로젝트마다 슬롯 번호 `n`(01–99)을 하나씩 준다. 모든 포트는 `종류별 기준값 + n`이다.

| 종류 | 공식 | 범위 | 용도 |
|---|---|---|---|
| web | 8100 + n | 8101–8199 | Docker nginx, 127.0.0.1 바인딩 |
| api | 3100 + n | 3101–3199 | Express (로컬 개발과 컨테이너 내부) |
| e2eApi | 3200 + n | 3201–3299 | Playwright가 띄우는 API |
| vite | 5200 + n | 5201–5299 | Vite 개발 서버 (`strictPort: true`) |
| e2eWeb | 5300 + n | 5301–5399 | Playwright가 띄우는 Vite |
| db | 15400 + n | 15401–15499 | 호스트에서 접속하는 PostgreSQL |

- 고른 이유:
  - 흔히 쓰는 기본 포트(3000, 4173, 5173, 5432, 8080)를 범위에서 피했다.
  - Windows(49152 이상)와 Linux(32768–60999)의 임시 포트 범위를 피했다.
  - 이 PC의 예약 포트(50000–50059)와 사용 중인 포트(55536)도 피했다.
  - 숫자 끝 두 자리만 보면 어느 프로젝트인지 알 수 있다.
- `registry/platform.json`의 `reservedPorts`에 있는 번호는 어떤 슬롯도 쓸 수 없다. 은퇴한 슬롯은 `status: "retired"`로 남겨 두고 다시 배정하지 않는다. 신규 프로젝트는 지금까지 쓴 가장 큰 슬롯 + 1을 받는다.
- 운영 서버의 노출 포트(`WEB_BIND`, `WEB_PORT`)는 서버 `.env`가 정하므로 이 체계와 상관없다.

### 6.2 초기값

| 슬롯 | 프로젝트 | 도메인 | web | api | e2eApi | vite | e2eWeb | db | DB 이름 / 테스트 DB |
|---|---|---|---|---|---|---|---|---|---|
| 01 | workout-memo | 운동 | 8101 | 3101 | 3201 | 5201 | 5301 | 15401 | workout / workout_test |
| 02 | study-log | 공부 | 8102 | 3102 | 3202 | 5202 | 5302 | 15402 | study / study_test |
| 03 | health-log | 건강 | 8103 | 3103 | 3203 | 5203 | 5303 | 15403 | health / health_test |
| 04 | life-journal | 일기 | 8104 | 3104 | 3204 | 5204 | 5304 | 15404 | journal / journal_test |
| 05 | money-ledger | 가계부 | 8105 | 3105 | 3205 | 5205 | 5305 | 15405 | money / money_test |
| 06 | cert-manager | 자격증 | 8106 | 3106 | 3206 | 5206 | 5306 | 15406 | cert / cert_test |
| 07 | plan-routine | 루틴 | 8107 | 3107 | 3207 | 5207 | 5307 | 15407 | plan / plan_test |
| 08 | dev-career-portfolio | 커리어 | 8108 | 3108 | 3208 | 5208 | 5308 | 15408 | career / career_test |

현재 값에서 바뀌는 내용(이전 → 이후):

| 프로젝트 | web | api | vite | db | e2e (api / web) |
|---|---|---|---|---|---|
| workout-memo | 8088 → 8101 | 3001 → 3101 | 5173(미지정) → 5201 | 55432 → 15401 | 3101 / 5174 → 3201 / 5301 |
| study-log | 8092 → 8102 | 3012 → 3102 | 5172 → 5202 | 55442 → 15402 | 없음 → 3202 / 5302 |
| health-log | 8093 → 8103 | 3013 → 3103 | 5173 → 5203 | 55443 → 15403 | 없음 → 3203 / 5303 |
| life-journal | 8094 → 8104 | 3014 → 3104 | 5174 → 5204 | 55444 → 15404 | 없음 → 3204 / 5304 |
| money-ledger | 8095 → 8105 | 3015 → 3105 | 5175 → 5205 | 55445 → 15405 | 없음 → 3205 / 5305 |
| english-study | 8096 → 8106 | 3016 → 3106 | 5176 → 5206 | 55446 → 15406 | 없음 → 3206 / 5306 |
| plan-routine | 8097 → 8107 | 3017 → 3107 | 5177 → 5207 | 55447 → 15407 | 없음 → 3207 / 5307 |
| dev-career-portfolio | 8098 → 8108 | 3018 → 3108 | 5178 → 5208 | 55448 → 15408 | 없음 → 3208 / 5308 |

DB 포트가 바뀌면 각 사용자의 로컬 `.env`에 있는 `DATABASE_URL`도 직접 바꿔야 한다. `.env`는 동기화하지 않는다. 포트 변경은 각 앱의 이슈·PR에 포함한다(10장).

### 6.3 `registry/projects.json` 항목

```jsonc
{
  "slot": 1,
  "status": "active",                       // active | retired
  "name": "workout-memo",
  "domain": "운동",
  "repos": {
    "umbrella": "workout-memo",
    "frontend": "workout-memo-frontend",
    "backend": "workout-memo-backend",
    "db": "workout-memo-db"
  },
  "ports": { "web": 8101, "api": 3101, "e2eApi": 3201, "vite": 5201, "e2eWeb": 5301, "db": 15401 },
  "db": { "name": "workout", "testName": "workout_test" },
  "service": { "domain": null, "subdomain": null },   // 미정. 생기면 값만 채운다
  "aws": { "prefix": null },                          // 미정
  "features": { "e2e": true, "openapi": true, "contract": true },
  "skills": ["workout-foundation", "workout-implementation", "workout-testing"],
  "allowedDifferences": []                            // [{ "path": "...", "reason": "...", "until": "YYYY-MM-DD" | null }]
}
```

- 스키마는 `service.domain`, `service.subdomain`, `aws.prefix`에 `null`을 허용한다. `null`인 값은 충돌 검사와 교차 검사에서 건너뛰고, `docs/projects.md`에는 "미정"으로 표시한다.
- `ports`는 명시적으로 적는다. 그래야 검색하기 쉽다. `registry-check`가 공식(`기준값 + slot`)과 일치하는지 확인하고, 다르면 실패한다.

### 6.4 `registry/platform.json`

```jsonc
{
  "rootDomain": null,                      // 서비스 루트 도메인. 미정
  "aws": {
    "region": "ap-northeast-2",            // shared-aws-infrastructure variables.tf 기본값
    "accountAlias": null,
    "sharedPrefix": null                   // 공유 리소스 이름 접두어. 미정
  },
  "portScheme": { "web": 8100, "api": 3100, "e2eApi": 3200, "vite": 5200, "e2eWeb": 5300, "db": 15400, "maxSlot": 99 },
  "reservedPorts": [3000, 4173, 5173, 5432, 8080]
}
```

### 6.5 중앙 CI 검사

- 스키마 검증. 스키마 검증기는 직접 작성하고, 필요한 JSON Schema 부분 집합만 지원한다.
- 슬롯, 이름, 리포 이름, DB 이름, 테스트 DB 이름, 도메인(`null` 제외), AWS 접두어(`null` 제외)의 중복을 검사한다.
- 모든 프로젝트의 모든 포트를 한 집합으로 모아 중복을 검사하고, `reservedPorts`와 겹치는지도 본다.
- 포트가 공식과 일치하는지, `allowedDifferences`에 사유가 있는지 확인한다.
- `docs/projects.md`를 다시 생성해서 커밋된 파일과 비교한다. 다르면 실패한다.

### 6.6 신규 프로젝트 추가 절차

1. `registry/projects.json`에 다음 슬롯으로 항목을 추가하고 `sync.config.json`에 target을 추가한다. 스캐폴드가 테스트와 공통 UI 의존성을 함께 넣으므로 `features.e2e`·`vitest`·`ui`를 켜고 등록한다([테스트 설정](test-config.md)).
2. 충돌 검사와 `docs/projects.md` 재생성까지 통과한 PR을 병합한다.
3. [사용자] 우산 리포와 subtree 리포 3개를 만들고 App 설치 범위에 추가한다.
4. `node scripts/scaffold.mjs <이름> --out <폴더>`로 첫 커밋을 만든다. `scaffold/app`(프로젝트 소유 시작 파일), `docs/runbooks`(운영 문서), 계약 복제본, 그리고 첫 동기화가 쓸 중앙 관리 파일과 manifest를 함께 렌더링한다. 이후 변경은 동기화 PR로 들어온다.

## 7. 하위 리포 감지와 안내

```
하위 PR / push
  → .github/workflows/ci.yml (관리 파일)
  → uses: sirloinbh/project-standards/.github/workflows/reusable-app-ci.yml@<중앙 SHA>
      jobs: verify(lint·typecheck·test·deploy/*.sh 문법), e2e(features.e2e일 때. e2eVisual이면 고정 컨테이너 e2e-visual), docker-build, standards-check
      (레지스트리 public 앱은 private 중앙 리포의 재사용 워크플로를 부를 수 없어 ci.yml에 이 내용을 펼쳐 넣는다, #209)
  → standards-check: node .standards/check.mjs
      ├─ full·section 파일 해시 비교
      ├─ package.json 필드, 설치된 @sirloinbh/* 버전, 설치 스크립트 없음, dependencies 0개
      ├─ manifest.registry와 compose·vite·playwright·server·nginx·Dockerfile 포트, DB 이름 비교
      ├─ .env.example 주석 규칙(docs/env-conventions.md) 검사
      ├─ 디렉토리·라우터 규칙 → ::warning (실패 아님)
      └─ 위반이 있으면 exit 1, 다음을 출력:
           ✗ .editorconfig — 중앙 경로: templates/common/.editorconfig
           고치려면 중앙 리포에서:
             ghp issue create -R sirloinbh/project-standards --title "<요약>"
             git switch -c fix/<이슈번호>-<slug>
             (templates/... 수정 → 테스트 → PR)
           프로젝트 고유 차이라면: registry/projects.json의 allowedDifferences에 사유와 함께 등록하는 PR
```

- 하위 리포의 로컬 `npm run check`에도 `standards:check`를 넣어서, 커밋하기 전에 같은 결과를 볼 수 있게 한다.
- reusable workflow를 호출하려면 [사용자]가 중앙 리포 Settings → Actions → General → Access에서 "Accessible from repositories owned by the user"를 켜야 한다.

## 8. 충돌 처리 규칙

1. **중앙 변경과 하위 수정이 겹칠 때:** 동기화 PR은 항상 "하위 main + 중앙 최신 렌더링"으로 다시 만든다. 그래서 하위에서 수정한 내용은 diff에 되돌림으로 보인다. 그 수정을 살리려면 중앙 리포에 이슈를 연다.
2. **처음 적용할 때 기존 파일이 다르면:** PR 본문에 파일별 "고유 내용을 `AGENTS.project.md`나 프로젝트 구간으로 옮길 것" 체크리스트를 넣는다. 옮기기 전에는 병합하지 말라고 표시한다.
3. **package.json의 `^` 범위를 고정할 때:** sync가 하위 `package-lock.json`(루트와 `frontend/`·`backend/`)에 실제 설치된 버전을 읽어서 그 정확한 버전으로 바꾼다. lockfile 안의 선언 범위 필드도 JSON으로만 수정한다. 설치되는 버전이 바뀌지 않으므로 14일 규칙에 걸리지 않는다. 결과 확인은 CI의 `npm ci`가 맡는다.
4. **새 패키지(`@sirloinbh/*`)를 추가할 때:** lockfile을 재생성해야 하므로 PR 체크리스트에 남긴다. 사용자가 승인한 뒤 `npm install --ignore-scripts`로 갱신해 같은 PR에 커밋한다.
5. **중앙에서 파일을 삭제할 때:** manifest에 있고 현재 해시가 같은 파일만 삭제한다. 해시가 다르면 남겨 두고 PR 본문에 경고를 쓴다.
6. **레지스트리 값과 고유 파일:** 덮어쓰지 않는다. 사유 없는 `allowedDifferences`는 스키마에서 거부한다. `until`이 지나면 중앙 CI가 경고한다.
7. **열린 동기화 PR이 있는데 중앙이 다시 병합될 때:** 같은 PR을 갱신한다. 브랜치 이름에는 처음 SHA가 남고, 제목과 본문은 최신 SHA를 가리킨다.
8. **동기화 PR이 오래 병합되지 않을 때:** `docs/compliance.md`에 경과 일수를 표시한다. 자동 병합은 하지 않는다.

## 9. shared-aws-infrastructure (ADR-0005)

### 9.1 독립 원본 승격 (동기화보다 먼저 진행)

1. `git subtree split --prefix=infrastructure`로 만든 결과와 `shared-aws-infrastructure` main이 같은지 확인한다. 다르면 보고하고 멈춘다.
2. [사용자] 로컬 `workout-memo/infrastructure/terraform.tfstate`와 `.terraform/`을 새 로컬 clone 위치로 옮긴다. 옮기기 전에 리포 밖에 state 백업을 만든다. state는 커밋하지 않고 경로도 docs에 남기지 않는다.
3. shared-aws-infrastructure 리포:
   - 자체 CI(`terraform fmt -check`, `terraform validate`, `bash -n`)가 동작하는지 확인한다.
   - `AGENTS.md`를 원본으로 만든다.
   - workout-memo의 Terraform 관련 문서를 옮긴다.
4. workout-memo 리포:
   - `infrastructure/`를 제거하고 `infrastructure` remote 등록 절차를 삭제한다.
   - `ci.yml`의 terraform job은 제거하고, `deploy/*.sh`의 `bash -n` 검사는 남긴다.
   - `scripts/push-repositories.ps1`, `eslint.config.mjs`의 ignore, `AGENTS.md`, `docs/deployment.md`의 경로를 고친다.
5. remote backend(S3 등) 도입은 이 작업에 넣지 않는다. 다음 작업 후보로 남긴다.

### 9.2 infra 프로필

- 적용: Git 컨벤션, 이슈·PR 템플릿, `.editorconfig`, `.gitattributes`, `.gitignore` 공통부(`*.tfstate*`, `.terraform/`, `*.tfvars` 포함, `*.tfvars.example`은 허용), `AGENTS.md` 공통부, 인프라 관련 공통 스킬, 보안 기준선, `standards-check`.
- 제외: A안 패키지, `.nvmrc`·`.node-version`·`.npmrc`, 디렉토리·라우터 규칙, 앱용 CI.
- CI: `reusable-infra-ci.yml`이 `terraform fmt -check`, `terraform init -backend=false`, `terraform validate`, 셸 스크립트 `bash -n`, `standards-check`를 실행한다. Terraform 버전은 `versions.json`에서 가져온다.
- 동기화 PR은 `neverTouch` 경로를 건드리지 않는다. 본문에 "이 PR은 .tf 파일을 변경하지 않으며 terraform apply를 일으키지 않습니다"를 넣는다.
- 교차 검사: `aws.prefix`가 `null`이 아닌 프로젝트만, 그 접두어가 `.tf` 파일에 나타나는지 텍스트로 확인한다. 결과는 경고로만 낸다.

## 10. 통일 대상별 배포 방식

| 대상 | 방식 | 산출물 |
|---|---|---|
| 언어·프레임워크 | 문서 | `docs/stack.md`: 허용 목록, 신규 기준, 메이저 업그레이드 절차(중앙 ADR → `versions.json` → workout-memo 먼저 → 나머지) |
| 도구 버전 | B안 + `versions.json` | `.nvmrc`, `.node-version`, `packageManager`, `engines`, `.npmrc`, Docker 이미지 태그, CI Node 버전 |
| 코드 컨벤션 | A안 + B안 | 패키지 4개, `.editorconfig` |
| Git 컨벤션 | B안 + 문서 | Conventional Commits, `<type>/<issue>-<slug>`, 이슈·PR 템플릿, `docs/changes/` 규칙, 사용자만 병합, 브랜치 보호 체크리스트 |
| 에이전트 지침·스킬 | B안 | `AGENTS.md` 공통부, `skills/std-*`, `.claude/skills/std-*`, `scripts/claude-skills.mjs` |
| 디렉토리·라우터 | 문서 + 경고 + 스캐폴드 | `docs/directory-rules.md`, `scaffold/app`. React Router URL, Express `routes/` 모듈, `shared/contract.ts`, OpenAPI 생성 규칙 |
| 환경변수 | 구간 관리 + 생성 문서 | `.env.example` 중앙 구간(포트·DB 주입), 주석 규칙, `docs/env-matrix.md` |
| CI | reusable workflow | `reusable-app-ci.yml`, `reusable-infra-ci.yml`, 하위 호출부 |
| 의존성 | 문서 + B안 | 메이저 버전 통일표, `.github/dependabot.yml`(보안 업데이트만), `compliance.yml`에서 `npm audit` 결과 수집 |
| 디자인 토큰 | A안 + 문서 | `@sirloinbh/design-tokens`, `docs/design-system.md` 공통부(`components/ui` 규칙) |
| 보안 기준선 | B안 + 스크립트 | `.gitignore` 공통부, 금지 패키지 목록, `ioc-scan.mjs`, secret scanning 설정 체크리스트 |
| 운영 문서 | 템플릿 | `docs/daily`, `docs/next-steps` 형식, 백업·복구 절차, 배포 runbook |

`.env.example` 주석 규칙은 키 바로 위 줄에 `# @desc <설명> @required @secret @used=backend,compose` 형식으로 쓴다. `@secret`인 키는 기본값을 비우고, `docs/env-matrix.md`에도 값을 적지 않는다.

## 11. GitHub App

- 이름: `project-standards-sync`. 소유자는 `sirloinbh`이고 대상 리포 9개와 중앙 리포에만 설치한다.
- Repository permissions:
  - Contents: write
  - Pull requests: write
  - Metadata: read
  - **Workflows: write**: 동기화 대상에 `.github/workflows/ci.yml`이 있다. GitHub는 이 권한 없이 워크플로 파일을 바꾸는 push를 거부한다. 요구사항의 권한 3종에 더해 이 권한이 필요하다(ADR-0002).
- 개인키는 중앙 리포 secret `SYNC_APP_PRIVATE_KEY`에만 둔다. App ID는 variable `SYNC_APP_ID`에 둔다. 워크플로가 실행될 때마다 JWT로 1시간짜리 설치 토큰을 발급한다. 이 과정은 외부 Action 없이 `node:crypto`로 구현한다.
- 생성, 설치, 키 교체 절차는 `docs/github-app.md`에 쓴다. 교체 절차: 새 키 생성 → secret 교체 → sync 수동 실행으로 확인 → 이전 키 삭제. 모두 [사용자] 단계다.

## 12. 단계별 적용 계획

| 단계 | 리포 | 내용 | 실행 주체 |
|---|---|---|---|
| 0 | project-standards | 이 설계 문서와 ADR (이슈 #1) | 에이전트, 사용자 병합 |
| 1 | project-standards | 골격: `registry`, `versions.json`, `sync.config`, `packages/` 4개, `templates/`, `scripts/` + 테스트, 워크플로, 문서. `maxRollout=0` | 에이전트 |
| 2 | — | App 생성·설치, secret·variable 등록, Actions access, 첫 패키지 태그 push, 패키지 Actions access, Lightsail용 PAT | **사용자** |
| 3 | shared-aws-infrastructure, workout-memo | 인프라 독립 원본 승격 (9.1) | 에이전트 + 사용자 (state 이동) |
| 4 | workout-memo | (a) 포트 재배정 PR → (b) `maxRollout=1`로 첫 동기화 PR: AGENTS 분리, `std-*` 스킬, A안 패키지, `^` 고정, Action SHA 고정, reusable CI | 에이전트, 사용자 병합 |
| 5 | 나머지 앱 7개 | 앱마다 포트 재배정 PR → `maxRollout=2` 동기화 PR | 에이전트, 사용자 병합 |
| 6 | shared-aws-infrastructure | `maxRollout=3` 동기화 PR (infra 프로필) | 에이전트, 사용자 병합 |
| 7 | project-standards | `compliance.yml` 정기 실행 시작, `AGENTS.md`를 운영 지침으로 갱신 | 에이전트 |

각 리포 작업은 해당 리포에 이슈를 만들고 `<type>/<번호>-<slug>` 브랜치로 진행한다. 앱 리포는 main 병합이 곧 운영 배포이므로, 4·5단계 PR 본문에 배포 영향(포트, Docker 빌드 인증)을 명시한다.

## 13. 남은 확인 사항

- Lightsail 서버가 이미지를 직접 빌드하므로, tsconfig·design-tokens 패키지를 쓰려면 서버에 `read:packages` PAT가 필요하다(4.3). 대안은 CI에서 이미지를 빌드해 레지스트리로 배포하는 것인데, 이 설계의 범위 밖이다.
- `ignore-scripts=true`를 넣은 뒤 Docker 빌드에서 `npm ci --ignore-scripts`가 기존 의존성(esbuild, tesseract.js 등)으로 정상 빌드되는지 4단계에서 확인한다. 실패하면 해당 리포의 PR에서 보고한다.
