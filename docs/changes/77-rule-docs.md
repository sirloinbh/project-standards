# #77 규칙 문서 (스택·의존성·Git·디렉토리·디자인·환경변수)

## 변경

| 파일 | 내용 |
|---|---|
| `docs/stack.md` | 허용 목록(영역, 기술, 사용 현황, 근거 파일), 신규 프로젝트 기본 구성, 메이저 업그레이드 절차 |
| `docs/dependency-policy.md` | 메이저 버전 통일표(workout-memo lockfile 설치 버전), 정확한 버전·`--ignore-scripts` 규칙, 새 패키지 도입 절차(조사 → 14일 → 사용자 승인), Dependabot 보안 업데이트만 |
| `docs/git-conventions.md` | std-git-writing 요약표, 리포별 병합 정책, 브랜치 보호 체크리스트 |
| `docs/directory-rules.md` | 표준 디렉토리 트리, React Router URL 규칙, Express `routes/` 모듈과 `/api` 경로 규칙, `shared/contract.ts`, OpenAPI |
| `docs/design-system.md` | 공통 디자인 규칙: 토큰 쓰는 법(테마 색 6개만 앱별), 컴포넌트, 글자 스타일, 아이콘·이모지, 로딩, 반응형·접근성 |
| `docs/env-conventions.md` | `.env.example` 구간 구조, `@desc @required @secret @used` 주석 규칙 |
| `README.md` | 규칙 문서 링크 |

## 근거

- 디렉토리와 API 규칙은 workout-memo 실제 구조에서 가져왔다.
  - `frontend/src/app.tsx`의 `pages` 객체(`/`, `/journal`, `/goals` …)
  - `backend/src/routes/` 8개 모듈의 `register…Routes(app, pool)`
  - `/api/health`
  - `scripts/contract.mjs`
- 버전 표는 workout-memo `package-lock.json`의 설치 버전이다. 문서를 쓰는 중에 `19.x` 같은 자리 표시를 실제 버전으로 바꿨다.
- 오류 응답 형식은 #30에서 정하기로 하고 이 문서에서는 비워 뒀다.

## 검증

- 문서만 바꿨다. `npm run check` 통과, 문서 링크 검사(아래 PR 본문).
