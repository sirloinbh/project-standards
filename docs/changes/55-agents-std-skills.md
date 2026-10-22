# #55 AGENTS.md 공통부와 공통 스킬(std-*) 추출

## 변경

| 파일 | 내용 |
|---|---|
| `templates/app/AGENTS.md.tmpl`, `CLAUDE.md.tmpl` | 앱 공통 지침. 제목·설명·저장소·포트·DB 이름을 레지스트리에서 채운다. 첫 문단에서 `AGENTS.project.md`를 반드시 읽게 하고, 두 파일이 다르면 `AGENTS.project.md`가 우선한다 |
| `templates/common/skills/std-implementation/` | 이슈 → 브랜치 → 구현·docs → 테스트·PR → 병합 절차. std-backlog·std-git-writing과 연결했고, 병합 주체는 각 리포의 AGENTS.md를 따른다 |
| `templates/app/skills/std-testing/`, `std-foundation/` | 앱 리포용 테스트·개발 기반 스킬 |
| `templates/index.json` | `skills/` → `.claude/skills/` 복제(mirror) 규칙 |
| `scripts/lib/templates.mjs` | mirror 처리 |
| `scripts/lib/vars.mjs` | 대상별 템플릿 변수(`project`, `versions`, `platform`, `target`) |
| `registry/projects.json`·스키마, `docs/projects.md` | 프로젝트 `title`(한국어 이름)과 `summary`(서비스 설명) 추가 |
| `scripts/test/agents.test.mjs` | 9개 대상 전부 렌더링: AGENTS·CLAUDE 내용, 스킬 5종과 복제본, frontmatter·헤더 검사 |

## 비교 결과

- **7개 앱:** AGENTS.md는 제목, 서비스 설명 한 줄, 포트만 다르다. 스킬 3종은 제목 한 줄만 다르다. 그래서 템플릿 변수로 바로 공통화했다.
- **workout-memo:** 공통 내용에 더해 운동 분야 규칙, 설치된 테스트 도구, contract·OpenAPI 절차, 로컬 에이전트 운영이 있다. 아래 표대로 나눈다.

### workout-memo AGENTS.md 분류표

| workout-memo의 내용 | 분류 | 옮길 곳 |
|---|---|---|
| 구현 작업 절차 1–5, 질문·조사는 이슈 안 만듦 | 공통 | `AGENTS.md` |
| 포트, 날짜·시간대, 서버 검증·트랜잭션, `.env`·state 금지, 필요한 파일만 stage, npm 설치 재확인, subtree 직접 push 금지 | 공통 | `AGENTS.md` (포트는 레지스트리 값) |
| `ghp`·Codex 계정B(`CODEX_HOME`)·인증 문서 | 고유 → 이후 공통 | `AGENTS.project.md`, #19(도구 중앙화) 이후 공통으로 |
| React Router·TanStack Query·RHF·Tailwind·`components/ui` | 고유 → 이후 공통 | `AGENTS.project.md`, 디자인 시스템(#120–#126) 이후 공통으로 |
| 중량 kg(기본중량 포함), 미확인 기본중량 NULL | 고유 | `AGENTS.project.md` |
| 스킬 목록, daily·next-steps 기록 규칙 | 공통 | `AGENTS.md` (std-* 스킬로) |
| `docs/design-system.md` 규칙 | 고유 → 이후 공통 | `AGENTS.project.md`, #77·#123 이후 공통으로 |
| 단위 테스트 도구(node:test, Vitest), Playwright e2e, `db:migrate`, `contract:sync`, API 라우트·OpenAPI 절차 | 고유 | `AGENTS.project.md` |
| 인프라(`terraform`) 검증과 배포 | 제거 | #94에서 workout-memo 밖으로 이동 |
| npm 도입 절차(`references/procedures.md`) | 고유 | `workout-foundation` 고유 스킬에 유지 |
| 로컬 에이전트 작업(큐·워커·모델 표) | 고유 | `AGENTS.project.md`, #38 조사 결과에 따라 결정 |

### 스킬

| 기존 스킬 | 처리 |
|---|---|
| 7개 앱의 `<프로젝트>-implementation`·`-testing`·`-foundation` | std-*와 내용이 같으므로, 각 앱의 사전 정리(#99)에서 삭제하고 레지스트리 `skills`를 비운다 |
| `workout-implementation` | std-implementation과 같으므로 삭제 |
| `workout-testing` | 설치된 테스트 도구·픽셀 비교·계약 기준 테스트 데이터 규칙만 남긴 고유 스킬로 축소 |
| `workout-foundation` | `references/stack.md`, `procedures.md`와 운동 분야 규칙만 남긴 고유 스킬로 축소 |

이 처리는 workout-memo 사전 정리(#95)와 나머지 앱 사전 정리(#99)에서 진행한다.

## 정한 규칙

- `AGENTS.md`와 `CLAUDE.md` 템플릿도 `.tmpl`로 저장한다. Codex와 Claude Code는 하위 폴더의 AGENTS.md·CLAUDE.md를 실제 지침으로 읽기 때문이다.
- std-implementation은 app·infra 공통이라 프로젝트 변수(`project.*`)를 쓰지 않고, 대상 리포 이름(`target.repo`)만 쓴다.

## 검증

- `npm run check`: 테스트 54개 통과, `registry-check: ok`, `docs/projects.md: up to date`
- 9개 대상 전부를 렌더링해서, 정의되지 않은 템플릿 변수가 없음을 확인했다. 변수가 하나라도 없으면 렌더러가 실패한다.
- 작성 중 std-implementation에서 `sirloinbh/{{target.repo}}`가 `sirloinbh/sirloinbh/…`로 렌더링되는 문제를 발견해 고쳤다. 테스트가 `sirloinbh/study-log` 형태를 확인한다.
