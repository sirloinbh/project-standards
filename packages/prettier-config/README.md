# @sirloinbh/prettier-config

sirloinbh 앱 공통 Prettier 설정이다. 앱의 `prettier.config.mjs`(중앙 관리 파일)가 이 JSON을 불러 쓰고, 앱이 설치한 플러그인(`prettier-plugin-tailwindcss`)만 더한다(#246).

```js
import shared from '@sirloinbh/prettier-config' with { type: 'json' };
export default { ...shared, plugins: ['prettier-plugin-tailwindcss'], tailwindStylesheet: './frontend/src/index.css' };
```

#246 전에는 앱의 `.prettierrc.json`이 패키지 이름 문자열 하나(`"@sirloinbh/prettier-config"`)였다. 동기화가 이 파일을 지운다.
