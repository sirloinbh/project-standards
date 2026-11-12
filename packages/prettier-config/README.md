# @sirloinbh/prettier-config

The shared Prettier config for sirloinbh apps. The app's `prettier.config.mjs` (a centrally managed file) loads this JSON and adds only the plugin the app installed (`prettier-plugin-tailwindcss`) (#246).

```js
import shared from '@sirloinbh/prettier-config' with { type: 'json' };
export default { ...shared, plugins: ['prettier-plugin-tailwindcss'], tailwindStylesheet: './frontend/src/index.css' };
```

Before #246, the app's `.prettierrc.json` was a single string, the package name (`"@sirloinbh/prettier-config"`). Sync deletes that file.
