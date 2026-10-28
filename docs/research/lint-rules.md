# 공유 ESLint·Prettier 설정 보강 후보 (#244)

2026-10-28 조사. 이 문서는 비교와 권장안이다. 사용자가 확인한 결정은 맨 아래 "결정"에 적고, 패키지 설치 승인은 #245, 공유 설정 반영은 #246에서 한다. 조사 중에는 아무것도 설치하지 않았다. 패키지 정보는 읽기 전용 `npm view`, deps.dev API, npm 다운로드 API로 모았다.

## 지금 상태

- `@sirloinbh/eslint-config` 1.0.0: `@eslint/js` recommended, `typescript-eslint` recommended(타입 정보 없음), 미사용 변수, React Hooks 2개, `eslint-config-prettier`.
- `@sirloinbh/prettier-config` 1.0.0: 따옴표·쉼표·줄 길이만 정한다. 플러그인 없음.
- ESLint는 10.12.0이다. **ESLint 10을 peerDependencies에 적지 않은 플러그인은 `npm install`이 peer 충돌로 멈춘다.** 앱 `.npmrc`에는 `legacy-peer-deps`가 없고, 넣지 않는 것이 좋다.

## 1. 후보별 판단

| 후보 | 새 패키지 | 무엇을 잡나 | 판단 |
|---|---|---|---|
| typescript-eslint 타입 정보 규칙 일부 | 없음 (이미 설치됨) | 처리하지 않은 Promise, Promise를 잘못 넘김, 불필요한 타입 단언 | **채택 권장** |
| typescript-eslint `recommendedTypeChecked` 전체 | 없음 | 위 + `no-unsafe-*`(any 전파) | 보류. 아래 2장 참고 |
| `eslint-plugin-react-refresh` | 1개 | Vite 빠른 새로고침이 깨지는 export(컴포넌트 파일에서 컴포넌트가 아닌 것을 export) | **채택 권장** |
| 접근성: `eslint-plugin-jsx-a11y-x` | 1개 (+하위 7개) | 대체 텍스트 누락, 클릭만 되는 div, 잘못된 ARIA | **채택 권장** (원본 대신 포크, 아래 참고) |
| 접근성: `eslint-plugin-jsx-a11y` (원본) | 1개 (+하위 15개) | 위와 같음 | 비권장. ESLint 10 미지원(peer `^9`까지), 2024-10 이후 릴리스 없음 |
| import 정렬: `eslint-plugin-simple-import-sort` | 1개 (하위 0개) | import 순서. `--fix`로 자동 정렬 | **채택 권장** |
| import 정렬: `eslint-plugin-perfectionist` | 1개 (+3개) | import 외에 객체·타입 키까지 정렬 | 비권장. 범위가 넓고, 최신 5.13.0은 릴리스 14일이 안 됨 |
| `eslint-plugin-import-x` | 1개 (+9개) | 순환 import, 없는 모듈 | 비권장. 무겁고(1 MB), 타입 검사(`tsc`)와 겹침 |
| `prettier-plugin-tailwindcss` | 1개 (하위 0개) | Tailwind 클래스 순서를 공식 순서로 정렬 | **채택 권장** |

접근성 포크를 고른 이유: 원본 `eslint-plugin-jsx-a11y`는 주간 다운로드가 4천만 회가 넘지만 ESLint 10을 지원한다고 선언하지 않았다. 설치하려면 `--legacy-peer-deps`를 써야 하고, 그러면 다른 peer 충돌까지 함께 숨겨진다. `eslint-plugin-jsx-a11y-x`는 es-tooling(e18e 생태계 정리 프로젝트) 조직의 포크로, ESLint 9·10을 지원하고 npm 출처 증명(provenance)이 붙어 있다. 대신 사용자가 적다(주간 약 24만 회). 원본이 ESLint 10을 지원하면 원본으로 돌아가는 것도 방법이다.

## 2. 앱 8개 위반 수 (설치된 패키지로 센 값)

typescript-eslint 8.71.2는 앱마다 이미 설치돼 있어, 설치 없이 `recommendedTypeCheckedOnly`를 켜고 `frontend/src`, `backend/src`를 셌다(이 PC의 로컬 체크아웃 기준, 2026-10-28).

| 규칙 | workout-memo | study-log | 나머지 6개 (앱마다) |
|---|---:|---:|---:|
| `no-floating-promises` (처리하지 않은 Promise) | 1 | 0 | 0 |
| `no-misused-promises` (Promise를 boolean·콜백 자리에) | 1 | 0 | 0 |
| `await-thenable` | 0 | 0 | 0 |
| `no-unnecessary-type-assertion` | 16 | 4 | 2 |
| `require-await` (await 없는 async) | 4 | 1 | 1~2 |
| `no-base-to-string`, `restrict-template-expressions` | 3 | 1 | 1~2 |
| `unbound-method` | 1 | 6 | 6 |
| `no-redundant-type-constituents` | 2 | 7 | 7 |
| `no-unsafe-*` 5개 합계 | 105 | 940 | 770~1,012 |

- 위의 5개 규칙은 위반이 거의 없어 바로 켤 수 있다. 1~16개는 앱마다 한 PR로 고칠 수 있다.
- `no-unsafe-*` 수천 건은 대부분 테스트 파일(`*.test.tsx`)에서 나왔다. 이 PC의 앱 체크아웃에 vitest·testing-library가 설치돼 있지 않아 타입이 `any`로 잡힌 결과다. 실제 값은 CI(전부 설치됨)에서 다시 세야 한다. 그래서 이 묶음은 지금 켜지 않는다.
- 플러그인 3개(react-refresh, a11y, import 정렬)와 Tailwind 정렬은 설치 전이라 셀 수 없다. import 정렬과 Tailwind 정렬은 `--fix`·`prettier --write`로 자동으로 고쳐지므로, 처음 켤 때 앱마다 바뀌는 파일 수만 크다.

## 3. 패키지 검증 (dependency-policy.md 기준)

| 패키지 | 버전 | 릴리스 | 게시자 | 저장소 | 설치 스크립트 | 하위 의존성 | 출처 증명 | deps.dev 권고 | 주간 다운로드 |
|---|---|---|---|---|---|---:|---|---|---:|
| `eslint-plugin-react-refresh` | 0.5.7 | 2026-09-14 | arnaud-barre | github.com/ArnaudBarre/eslint-plugin-react-refresh | 없음 | 0 | 있음 | 없음 | 2,279만 |
| `eslint-plugin-jsx-a11y-x` | 0.2.0 | 2026-05-10 | 43081j | github.com/es-tooling/eslint-plugin-jsx-a11y-x | 없음 | 7 | 있음 | 없음 | 24만 |
| `eslint-plugin-simple-import-sort` | 14.0.0 | 2026-07-16 | lydell | github.com/lydell/eslint-plugin-simple-import-sort | 없음 | 0 | 없음 | 없음 | 519만 |
| `prettier-plugin-tailwindcss` | 0.8.1 | 2026-07-15 | tailwindlabs 4명 | github.com/tailwindlabs/prettier-plugin-tailwindcss | 없음 | 0 | 있음 | 없음 | 880만 |

- 네 버전 모두 릴리스 후 14일이 지났고, 게시자와 저장소가 공식 프로젝트와 일치한다.
- `eslint-plugin-jsx-a11y-x`의 하위 의존성 7개는 `^` 범위다(`aria-query`, `axe-core`, `axobject-query`, `damerau-levenshtein`, `jsx-ast-utils-x`, `language-tags`, `minimatch`). lockfile에 고정되는 버전을 설치 PR에서 `ioc-scan`과 함께 확인한다.
- Socket(socket.dev) 점수는 로그인 없이 API로 볼 수 없어 확인하지 못했다. 승인 전에 사용자가 웹에서 확인한다.
- `typescript-eslint` 최신은 8.72.1(2026-10-26)이지만 14일이 안 돼 지금 8.71.2를 유지한다.

## 4. 권장안

**ESLint (`@sirloinbh/eslint-config` 1.1.0)**

- 타입 정보 규칙 5개를 `error`로 켠다: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-type-assertion`, `require-await`. `parserOptions.projectService: true`가 필요하다. 타입 검사를 함께 하므로 린트 시간이 늘어난다. 실제 시간은 #246에서 CI로 잰다.
- `react-refresh/only-export-components`를 `warn`으로 켠다(Vite 권장 설정).
- `jsx-a11y-x`의 `recommended`를 프런트 파일에 켠다.
- `simple-import-sort/imports`, `simple-import-sort/exports`를 `error`로 켠다.
- 팩토리 인자에 `reactRefresh`, `jsxA11y`, `importSort`를 더한다. 지금처럼 패키지는 아무것도 import하지 않고, 인자가 없으면 그 규칙을 건너뛰어 1.0.0 앱도 깨지지 않게 한다.

**Prettier (`@sirloinbh/prettier-config` 1.1.0)**

- `plugins: ["prettier-plugin-tailwindcss"]`, `tailwindStylesheet: "./frontend/src/index.css"`(Tailwind 4는 CSS 진입 파일 경로가 필요하다. 앱마다 경로를 #246에서 확인).

**설치할 패키지 (#245에서 승인, 앱 8개 루트 devDependencies)**

```
eslint-plugin-react-refresh@0.5.7
eslint-plugin-jsx-a11y-x@0.2.0
eslint-plugin-simple-import-sort@14.0.0
prettier-plugin-tailwindcss@0.8.1
```

## 결정

- (사용자 확인 전)
