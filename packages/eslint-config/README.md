# @sirloinbh/eslint-config

sirloinbh 앱 공통 ESLint 설정이다. 패키지는 아무것도 import하지 않고, 앱이 설치한 플러그인을 인자로 받는다.

```js
// eslint.config.mjs (중앙 관리 파일)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import { createConfig } from '@sirloinbh/eslint-config';

export default createConfig({ js, tseslint, globals, reactHooks, prettier }, { tsconfigRootDir: import.meta.dirname });
```

- 옵션
  - `ignores`: 추가로 제외할 경로
  - `frontendFiles`: React 규칙을 적용할 경로 (기본 `frontend/src/**/*.{ts,tsx}`)
  - `tsconfigRootDir`: 넘기면 타입 정보 규칙 5개를 켠다(1.1.0). `eslint.config.mjs`의 `import.meta.dirname`을 넘긴다
  - `typedFiles`: 타입 정보 규칙을 적용할 경로 (기본 `frontend/src/**/*.{ts,tsx}`, `backend/src/**/*.ts`)
- 선택 플러그인(1.1.0): 앱이 설치해서 넘기면 그 규칙을 켠다. 넘기지 않으면 건너뛴다.

  | 인자 | 패키지 | 켜는 규칙 |
  |---|---|---|
  | `reactRefresh` | `eslint-plugin-react-refresh` (`import { reactRefresh } from ...`) | `configs.vite()` (`frontendFiles`) |
  | `jsxA11y` | `eslint-plugin-jsx-a11y-x` | `configs.recommended` (`frontendFiles`) |
  | `importSort` | `eslint-plugin-simple-import-sort` | `simple-import-sort/imports`, `exports` |

- 모든 파일에 `type`만 쓰기(`interface` 금지)와 default export 금지를 적용한다. 도구 설정 파일(`*.config.*`)은 default export를 쓴다.
- peerDependencies의 버전은 정확히 고정되어 있다. 앱의 `devDependencies`도 같은 버전이어야 한다.
