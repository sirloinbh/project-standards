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
//   export default createConfig({ js, tseslint, globals, reactHooks, prettier });

export const DEFAULT_IGNORES = ['**/node_modules/**', '**/dist/**', '.local/**'];

/**
 * @param {{ js: any, tseslint: any, globals: any, reactHooks: any, prettier: any }} plugins
 * @param {{ ignores?: string[], frontendFiles?: string }} [options]
 */
export function createConfig({ js, tseslint, globals, reactHooks, prettier }, { ignores = [], frontendFiles = 'frontend/src/**/*.{ts,tsx}' } = {}) {
  return tseslint.config(
    { ignores: [...DEFAULT_IGNORES, ...ignores] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx,js,mjs}'],
      languageOptions: { globals: globals.node },
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
    {
      files: [frontendFiles],
      languageOptions: { globals: globals.browser },
      plugins: { 'react-hooks': reactHooks },
      rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
    },
    prettier,
  );
}
