# #308 공유 ESLint 설정 1.1.0: 설치 없이 쓰는 규칙과 선택 플러그인 인자

## 변경

| 파일 | 내용 |
|---|---|
| `packages/eslint-config/index.mjs` | 관례 규칙 2개(모든 파일), `tsconfigRootDir` 옵션으로 켜는 타입 정보 규칙 5개, 선택 플러그인 인자 3개 |
| `packages/eslint-config/package.json`, `CHANGELOG.md`, `README.md` | 1.1.0 |
| `scripts/test/packages.test.mjs` | 1.1.0 규칙 검사 3개, 기존 순서 검사 갱신 |

## 정한 것

- 1.0.0 앱 설정(`createConfig({ js, tseslint, globals, reactHooks, prettier }, { ignores })`)을 그대로 쓰면 1.1.0에서 새로 켜지는 것은 관례 규칙 2개뿐이다. 앱 8개의 위반은 0개다.
  - `@typescript-eslint/consistent-type-definitions: type`
  - default export 금지(`no-restricted-syntax`). 도구 설정 파일(`*.config.*`)은 default export가 필요해서 뺐다.
- 타입 정보 규칙은 `tsconfigRootDir`를 넘길 때만 켠다. 타입 검사를 하므로 `frontend/src`·`backend/src`(옵션 `typedFiles`)에만 적용한다. 설정 파일·스크립트는 tsconfig에 없어서 `projectService`가 찾지 못하기 때문이다.
- 선택 플러그인은 앱이 넘길 때만 규칙을 넣는다. 패키지 코드는 설치 승인(#245) 전에 배포해도 앱이 깨지지 않는다.
  - `reactRefresh`: 0.5의 `import { reactRefresh }` 객체. `configs.vite()`를 프런트 파일에 적용한다.
  - `jsxA11y`: `eslint-plugin-jsx-a11y-x`의 `configs.recommended`를 프런트 파일에 적용한다(이 설정은 `files`를 정하지 않는다).
  - `importSort`: `simple-import-sort/imports`, `exports`를 `error`로 켠다.
  - API는 `npm view <패키지>@<버전> readme`(읽기 전용)로 확인했다. 실제 플러그인으로 돌려 보는 것은 설치 뒤 #246에서 한다.
- 앱 템플릿(`templates/app/eslint.config.mjs.tmpl`)은 이번에 바꾸지 않았다. `tsconfigRootDir`와 플러그인을 넘기는 일은 #246에서 앱별 위반 수정과 함께 한다.

## 앱별 위반 (타입 정보 규칙, `tsconfigRootDir`를 넘겼을 때)

| 규칙 | workout-memo | study-log | 나머지 6개 | 고치는 법 |
|---|---:|---:|---:|---|
| `no-unnecessary-type-assertion` | 16 | 4 | 2 (#244 조사) | `eslint --fix` (자동) |
| `require-await` | 4 | 1 | 1~2 (#244 조사) | `async`를 지우거나 `await`를 넣는다 |
| `no-floating-promises` | 1 | 0 | 0 | `await`, `.catch()`, 또는 `void` |
| `no-misused-promises` | 1 | 0 | 0 | 이벤트 처리기에서 Promise를 직접 넘기지 않는다 |

workout-memo·study-log는 이 PC의 앱 체크아웃에서 앱에 설치된 ESLint·typescript-eslint로 1.1.0 설정을 그대로 돌려 셌다(Node API, 설치 없음). 파싱 오류는 없었다. 나머지 6개는 #244 조사 값이다.

## 배포 순서 (사용자)

1. 이 PR이 병합되면 태그 `eslint-config/v1.1.0`을 push한다(`publish.yml`이 GitHub Packages에 배포).
2. #246에서 앱 템플릿과 `versions.json` `packages.@sirloinbh/eslint-config`를 1.1.0으로 올린다. 관례 규칙만 켜는 것은 지금 바로 해도 앱 8개가 통과한다.

## 검증

- `node --test scripts/test/packages.test.mjs`: 10개 통과
- `npm run packages:check`: 통과
- `npm run check` 결과는 PR에 적는다
