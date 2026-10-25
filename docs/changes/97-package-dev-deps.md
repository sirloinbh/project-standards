# #97 동기화가 앱 package.json에 공유 패키지를 넣도록 수정

## 변경

| 파일 | 내용 |
|---|---|
| `templates/index.json` | app 프로필 `fields`에 `devDependencies`를 추가했다. 루트는 `@sirloinbh/eslint-config`·`prettier-config`, `frontend/`는 `design-tokens`·`tsconfig`, `backend/`는 `tsconfig`이고, 버전은 `versions.json`의 패키지 버전이다 |
| `scripts/lib/render.mjs` | 템플릿 변수 이름에 `@`와 `/`를 허용했다. `{{versions.packages.@sirloinbh/tsconfig}}`처럼 패키지 이름을 키로 쓸 수 있다 |
| `scripts/lib/sync-plan.mjs` | `applyFields`가 `dependencies`·`devDependencies`를 npm과 같은 순서로 정렬한다. 새 패키지가 목록 끝에 붙어 다음 `npm install`에서 순서가 바뀌는 일을 막는다 |
| `scripts/test/` | 렌더러, 필드 정렬, workout-memo 계획의 패키지 필드 테스트를 추가하고, 기존 fixture에 패키지 필드를 넣었다 |

## 정한 것

- 동기화되는 `eslint.config.mjs`, `.prettierrc.json`, `frontend/tsconfig.json`, `backend/tsconfig.json`이 이 패키지를 읽는다. 패키지가 `package.json`에 없으면 lint·타입 검사·Docker 빌드가 실패한다(#97 미리보기에서 확인).
- `design-tokens`는 아직 쓰는 파일이 없지만 `frontend/`에 넣는다. 매니페스트가 4개 패키지를 모두 검사하고, 공통 UI(`features.ui`)를 켜면 바로 쓰기 때문이다.
- lockfile은 동기화가 만들 수 없다. 각 앱이 동기화 전에 준비 PR로 패키지를 설치하고 lockfile을 갱신한다. 그러면 동기화 PR은 이미 있는 값만 확인한다.

## 검증

- `npm run check` 통과(테스트 403개 중 400 통과·3 건너뜀, registry-check, docs check, tokens check, package-guard, check-workflows)
- workout-memo 미리보기(`sync.mjs --dry-run --local`)에서 `package.json` 3개에 패키지 필드가 들어가는 것을 확인
