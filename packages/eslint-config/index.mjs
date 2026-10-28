// Shared ESLint flat config for sirloinbh apps.
// The package imports nothing: the app passes the plugins it installed (peerDependencies),
// so this file has no dependencies and can be tested with stubs.
//
//   import js from '@eslint/js';
//   import tseslint from 'typescript-eslint';
//   import globals from 'globals';
//   import reactHooks from 'eslint-plugin-react-hooks';
//   import prettier from 'eslint-config-prettier';
//   import { createConfig } from '@sirloinbh/eslint-config';
//   export default createConfig({ js, tseslint, globals, reactHooks, prettier }, { tsconfigRootDir: import.meta.dirname });
//
// Optional plugins (1.1.0): reactRefresh (eslint-plugin-react-refresh), jsxA11y (eslint-plugin-jsx-a11y-x) and
// importSort (eslint-plugin-simple-import-sort). Rules for a plugin the app did not pass are left out, so an app
// that has not installed it yet keeps working.

export const DEFAULT_IGNORES = ['**/node_modules/**', '**/dist/**', '.local/**'];
export const DEFAULT_TYPED_FILES = ['frontend/src/**/*.{ts,tsx}', 'backend/src/**/*.ts'];
// Tools such as Vite, Vitest, Playwright and ESLint read their config from a default export.
export const CONFIG_FILES = ['**/*.config.{ts,mts,cts,js,mjs,cjs}'];

// Rules that need type information (#244). They catch promises nobody awaits or handles and casts that do nothing.
export const TYPED_RULES = {
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  'require-await': 'off',
  '@typescript-eslint/require-await': 'error',
};

/**
 * @param {{ js: any, tseslint: any, globals: any, reactHooks: any, prettier: any, reactRefresh?: any, jsxA11y?: any, importSort?: any }} plugins
 * @param {{ ignores?: string[], frontendFiles?: string, tsconfigRootDir?: string, typedFiles?: string[] }} [options]
 *   tsconfigRootDir turns on the type-aware rules for typedFiles; pass import.meta.dirname of eslint.config.mjs.
 */
export function createConfig(
  { js, tseslint, globals, reactHooks, prettier, reactRefresh, jsxA11y, importSort },
  { ignores = [], frontendFiles = 'frontend/src/**/*.{ts,tsx}', tsconfigRootDir, typedFiles = DEFAULT_TYPED_FILES } = {},
) {
  const optional = [];
  if (tsconfigRootDir) {
    optional.push({ files: typedFiles, languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } }, rules: TYPED_RULES });
  }
  // Vite's preset allows constant exports next to components, which fast refresh handles (#244).
  if (reactRefresh) optional.push({ files: [frontendFiles], ...reactRefresh.configs.vite() });
  if (jsxA11y) optional.push({ files: [frontendFiles], ...jsxA11y.configs.recommended });
  if (importSort) {
    optional.push({
      files: ['**/*.{ts,tsx,js,mjs}'],
      plugins: { 'simple-import-sort': importSort },
      rules: { 'simple-import-sort/imports': 'error', 'simple-import-sort/exports': 'error' },
    });
  }
  return tseslint.config(
    { ignores: [...DEFAULT_IGNORES, ...ignores] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx,js,mjs}'],
      languageOptions: { globals: globals.node },
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        // Conventions the 8 apps already follow (#243): named exports only, and `type` instead of `interface`.
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        'no-restricted-syntax': [
          'error',
          { selector: 'ExportDefaultDeclaration', message: '이름 있는 export를 쓴다. default export는 도구 설정 파일(*.config.*)에만 쓴다.' },
        ],
      },
    },
    { files: CONFIG_FILES, rules: { 'no-restricted-syntax': 'off' } },
    {
      files: [frontendFiles],
      languageOptions: { globals: globals.browser },
      plugins: { 'react-hooks': reactHooks },
      rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
    },
    ...optional,
    prettier,
  );
}
