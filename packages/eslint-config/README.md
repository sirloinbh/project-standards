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

export default createConfig({ js, tseslint, globals, reactHooks, prettier });
```

- 옵션: `ignores`(추가로 제외할 경로), `frontendFiles`(React 규칙을 적용할 경로, 기본 `frontend/src/**/*.{ts,tsx}`)
- peerDependencies의 버전은 정확히 고정되어 있다. 앱의 `devDependencies`도 같은 버전이어야 한다.
