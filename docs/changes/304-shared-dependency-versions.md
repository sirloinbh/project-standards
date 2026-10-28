# #304 앱 공통 의존성 버전을 versions.json에 두고 관리 필드로 검사

## 변경

| 파일 | 내용 |
|---|---|
| `versions.json`, `versions.schema.json` | `dependencies`: 앱 8개와 스캐폴드가 같은 파일·칸·버전으로 쓰는 외부 의존성 37개 (`root`·`frontend`·`backend`) |
| `templates/index.json` | `dependencyFields`: 위 값을 앱 `package.json` 3개의 관리 필드로 쓰는 설정 |
| `scripts/lib/templates.mjs` | `sharedDependencyFields`: 관리 필드로 펼치고, 이름에 점이 있거나 `fields`와 겹치면 멈춤 |
| `scripts/gen-docs.mjs`, `docs/versions.md` | `versions.json`에서 버전 표 생성 |
| `docs/dependency-policy.md` | 손으로 쓰던 버전 표를 `versions.md` 안내와 한 앱만 쓰는 패키지 표로 바꿈 |
| `AGENTS.md`, `docs/design.md`, `docs/stack.md` | 원본 위치 안내 |
| `scripts/test/*` | 관리 필드·드리프트·생성 문서 테스트, 기존 fixture에 공통 의존성 추가 |

## 정한 것

- 검사는 새로 만들지 않고 기존 관리 필드(manifest `fields`)를 쓴다. 그래서 앱 하나만 버전이 다르면 `standards-check`가 "관리 필드가 다릅니다"로 실패하고, 중앙에서 버전을 올리면 동기화 PR이 앱 `package.json`을 바꾼다.
- 대상은 앱 8개와 스캐폴드(`scaffold/app/`)가 모두 같은 파일·같은 칸에 쓰는 것만이다. `concurrently`는 앱 8개는 쓰지만 스캐폴드에 없어서 뺐다. `@sirloinbh/*`는 이미 `packages`로 관리한다.
- 관리 필드 경로가 점으로 나뉘므로(`devDependencies.vite`) 이름에 점이 든 패키지(`tesseract.js` 등)는 넣을 수 없다. 넣으면 렌더링이 멈춘다.
- 동기화 PR이 `package.json` 버전을 바꾸면 lockfile은 그대로라 `npm ci`가 실패한다. 버전을 올리는 동기화 PR에서는 사용자가 `npm install --ignore-scripts`로 lockfile을 맞추고 `npm run lockfiles:sync`(#303)를 실행한다. 이번 변경은 지금 버전을 그대로 옮긴 것이라 앱에서 바뀌는 버전은 없다.

## 검증

- 앱 8개 `origin/main`의 `package.json` 3개를 37개 필드와 비교: 모두 같음
- `npm run check` 결과는 PR에 적는다
