# #303 하위 lockfile 일치 검사와 다시 만드는 명령

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/lockfiles.mjs` | lockfile 의존성 그래프, 하위 lockfile 비교, 루트 lockfile에서 하위 lockfile 만들기 (Node 기본 모듈만) |
| `scripts/lockfiles.mjs` | 명령: 비교(`--write` 없이), 다시 쓰기(`--write`) |
| `scripts/standards-check.mjs` | "하위 lockfile" 검사 추가 |
| `templates/index.json` | `.standards/lib/lockfiles.mjs`, `.standards/lockfiles.mjs` 복사, 앱 루트 `package.json`에 `lockfiles:sync` 스크립트 필드 |
| `scaffold/app/package.json.tmpl`, `scaffold/app/README.md` | 새 앱에도 같은 스크립트 |
| `scripts/test/lockfiles.test.mjs`, `scripts/test/standards-check.test.mjs`, `scripts/test/templates.test.mjs` | 테스트 |
| `scripts/test/fixtures/sync-snapshot.json` | 앱 8개에 두 파일 추가 |
| `docs/dependency-policy.md`, `docs/design.md` | 사용법과 파일 분류 |

## 정한 것

- 비교는 "설치되는 버전"만 본다. 패키지 이름마다 하위 lockfile에서 설치되는 버전 집합과, 루트 lockfile에서 그 workspace가 보는 버전 집합을 비교한다. 호이스팅 위치 차이는 무시한다.
- 선택적 peer 의존성(`peerDependenciesMeta.optional`)은 비교에서 따라가지 않는다. 루트 lockfile에서는 다른 workspace가 설치한 패키지(vite의 선택 peer `tsx`, backend가 설치)를 찾아 버려 거짓 차이가 난다. `dev`·`optional` 표시를 계산할 때는 npm처럼 따라간다.
- 묶음 의존성(`bundleDependencies`)은 따라가지 않는다. npm이 루트 lockfile에 적지 않는 경우가 있어서, 다시 쓸 때는 이전 하위 lockfile의 항목을 옮긴다.
- 다시 쓰기는 내려받기·설치를 하지 않는다. 루트 lockfile 항목(`resolved`, `integrity`)을 그대로 옮기고 위치와 표시만 다시 계산한다. 다시 쓴 뒤 같은 비교를 한 번 더 돌려 차이가 남으면 쓰지 않고 멈춘다.
- 위치는 npm과 다를 수 있다(충돌할 때 어느 버전을 위로 올릴지). `npm ci`는 lockfile에 적힌 위치대로 설치하므로 결과 버전은 같다.

## 검증

- 앱 8개 lockfile(origin/main)로 확인:
  - 비교: workout-memo `frontend/`만 7개 다름(`@asamuzakjp/css-color`, `@babel/runtime`, `tinybench`, `tldts`, `tldts-core`, `undici`, `whatwg-url`). 나머지 15개 파일은 0개. #240 조사 결과와 같다.
  - 표시 계산: 16개 하위 lockfile 모두 npm이 쓴 `dev`·`optional`·`devOptional`과 같다.
  - 다시 쓰기: `backend/` 8개는 기존 파일과 바이트까지 같다. `frontend/`는 버전이 같고 위치만 몇 곳 다르다.
  - workout-memo·study-log·health-log에서 다시 쓴 파일을 `npm ls --package-lock-only --all --offline`(읽기 전용, 내려받지 않음)으로 확인: 6개 모두 문제 없음.
- `npm run check` 결과는 PR에 적는다.

## 앱에 들어간 뒤

- 동기화 PR이 들어가면 workout-memo CI의 `standards-check`가 `frontend/package-lock.json`에서 실패한다. 같은 PR에서 `npm run lockfiles:sync`로 고친다(설치 없음).
