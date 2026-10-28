# 변경 기록

## 1.1.0

- 모든 파일: `@typescript-eslint/consistent-type-definitions: type`, default export 금지(`no-restricted-syntax`). 도구 설정 파일(`*.config.*`)은 default export를 쓴다(#243). 앱 8개의 위반은 0개다.
- 옵션 `tsconfigRootDir`를 넘기면 `frontend/src`·`backend/src`(옵션 `typedFiles`)에 타입 정보 규칙 5개를 켠다: `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unnecessary-type-assertion`, `require-await`(#244). 넘기지 않으면 켜지 않는다.
- 선택 플러그인 인자 `reactRefresh`(eslint-plugin-react-refresh, Vite 설정), `jsxA11y`(eslint-plugin-jsx-a11y-x recommended), `importSort`(eslint-plugin-simple-import-sort)를 받는다. 넘기지 않은 플러그인의 규칙은 넣지 않으므로, 아직 설치하지 않은 앱도 그대로 동작한다(#308).

## 1.0.0

- 첫 버전. 8개 앱의 기존 `eslint.config.mjs`와 같은 규칙을 팩토리(`createConfig`)로 제공한다(#65).
