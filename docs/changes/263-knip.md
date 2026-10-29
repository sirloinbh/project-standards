# #263 앱 CI에서 안 쓰는 파일·export·의존성 찾기 (knip)

## 변경

| 파일 | 내용 |
|---|---|
| `versions.json` | `dependencies.root.devDependencies.knip` 6.41.0 (앱 공통 의존성 38개) |
| `templates/index.json` | 앱 루트 `package.json` 관리 필드에 `scripts.knip` (`knip`) |
| `templates/app/knip.json` | 새 관리 파일. 중앙 관리 파일(`.standards/`, `frontend/public/`, 공통 UI 컴포넌트·레이아웃·도우미)은 검사에서 뺀다 |
| `templates/app/.prettierignore.tmpl` | 관리 파일 목록에 `knip.json` |
| `.github/workflows/reusable-app-ci.yml` | `verify` job의 `npm run check` 다음에 knip 단계. 실패해도 경고(`::warning`)만 낸다 |
| `docs/dependency-policy.md`, `docs/design.md` | 정기 점검에 knip, 공통 의존성 수 37 → 38 |
| `scripts/test/` | 관리 필드 기대값, 동기화 스냅샷 |

## 정한 것

- 설치 승인: #245 (2026-10-29). knip 6.41.0은 릴리스 14일이 지난 가장 새 버전이고, 하위 62개 모두 설치 스크립트가 없다.
- 진입 파일은 knip이 `package.json` 스크립트와 Vite·Vitest·Playwright·ESLint 설정에서 스스로 찾는다. 앱마다 진입 파일이 달라도 공통 설정 하나로 쓴다.
- 처음에는 경고만 낸다. 앱별 첫 결과를 보고 설정을 다듬은 뒤, 결과가 0이 된 앱부터 실패로 바꾼다(별도 이슈).

## 동기화 PR에서 할 일

동기화 PR은 앱 루트 `package.json`에 `knip`을 더하고 lockfile은 그대로 둔다. 그 PR 브랜치에서 사용자가 `--ignore-scripts`로 설치해 lockfile을 맞춘 뒤(#246과 한 번에), 에이전트가 `npm run knip`으로 첫 결과를 #263에 기록한다.

## 검증

- `npm run check`: 아래 PR 본문에 기록
