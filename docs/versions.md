# Version source

<!-- Generated file. Edit versions.json, then regenerate with `npm run docs`. -->

Tool and package versions set centrally. To change them, follow the [dependency policy](dependency-policy.md).

## Tools

| Item | Version |
|---|---|
| Node | 24.21.0 |
| npm | 11.19.0 |
| PostgreSQL | 17 |
| Terraform | >= 1.6.0 (CI 1.16.5) |
| GitHub runner | `ubuntu-24.04` |
| Image node | `node:24.21.0-alpine` |
| Image nginx | `nginx:1.27-alpine` |
| Image postgres | `postgres:17-alpine` |
| Image devcontainerNode | `node:24.21.0-bookworm` (digest pinned) |
| Image playwright | `mcr.microsoft.com/playwright:v1.63.0-noble` (digest pinned) |

## Shared config packages (@sirloinbh)

| Package | Version |
|---|---|
| `@sirloinbh/eslint-config` | 1.1.0 |
| `@sirloinbh/prettier-config` | 1.0.0 |
| `@sirloinbh/tsconfig` | 1.0.0 |
| `@sirloinbh/design-tokens` | 1.0.0 |

## Common app dependencies

External dependencies that the 8 apps and the scaffold use at the same version, in the same file and the same section. They are managed fields of each app `package.json`, so if even one app has a different version, `standards-check` fails (#304). Dependencies used by a single app are not listed here.

| Package | Version | File | Section |
|---|---|---|---|
| `@eslint/js` | 10.0.1 | `package.json` | devDependencies |
| `eslint` | 10.12.0 | `package.json` | devDependencies |
| `eslint-config-prettier` | 10.1.8 | `package.json` | devDependencies |
| `eslint-plugin-react-hooks` | 7.1.1 | `package.json` | devDependencies |
| `eslint-plugin-jsx-a11y-x` | 0.2.0 | `package.json` | devDependencies |
| `eslint-plugin-react-refresh` | 0.5.7 | `package.json` | devDependencies |
| `eslint-plugin-simple-import-sort` | 14.0.0 | `package.json` | devDependencies |
| `globals` | 16.5.0 | `package.json` | devDependencies |
| `knip` | 6.41.0 | `package.json` | devDependencies |
| `prettier` | 3.9.10 | `package.json` | devDependencies |
| `prettier-plugin-tailwindcss` | 0.8.1 | `package.json` | devDependencies |
| `typescript-eslint` | 8.71.2 | `package.json` | devDependencies |
| `class-variance-authority` | 0.7.1 | `frontend/package.json` | dependencies |
| `clsx` | 2.1.1 | `frontend/package.json` | dependencies |
| `lucide-react` | 1.52.0 | `frontend/package.json` | dependencies |
| `radix-ui` | 1.7.0 | `frontend/package.json` | dependencies |
| `react` | 19.3.0 | `frontend/package.json` | dependencies |
| `react-dom` | 19.3.0 | `frontend/package.json` | dependencies |
| `react-router` | 8.4.0 | `frontend/package.json` | dependencies |
| `sonner` | 2.0.8 | `frontend/package.json` | dependencies |
| `tailwind-merge` | 3.7.0 | `frontend/package.json` | dependencies |
| `tw-animate-css` | 1.4.0 | `frontend/package.json` | dependencies |
| `vaul` | 1.1.2 | `frontend/package.json` | dependencies |
| `@tailwindcss/vite` | 4.3.3 | `frontend/package.json` | devDependencies |
| `@testing-library/dom` | 10.4.2 | `frontend/package.json` | devDependencies |
| `@testing-library/jest-dom` | 7.0.1 | `frontend/package.json` | devDependencies |
| `@testing-library/react` | 16.3.3 | `frontend/package.json` | devDependencies |
| `@types/react` | 19.3.0 | `frontend/package.json` | devDependencies |
| `@types/react-dom` | 19.3.0 | `frontend/package.json` | devDependencies |
| `jsdom` | 30.1.2 | `frontend/package.json` | devDependencies |
| `tailwindcss` | 4.3.3 | `frontend/package.json` | devDependencies |
| `typescript` | 5.9.3 | `frontend/package.json` | devDependencies |
| `vite` | 6.4.5 | `frontend/package.json` | devDependencies |
| `vitest` | 5.0.3 | `frontend/package.json` | devDependencies |
| `express` | 5.3.0 | `backend/package.json` | dependencies |
| `pg` | 8.23.1 | `backend/package.json` | dependencies |
| `zod` | 4.6.7 | `backend/package.json` | dependencies |
| `@types/express` | 5.0.6 | `backend/package.json` | devDependencies |
| `@types/node` | 24.19.2 | `backend/package.json` | devDependencies |
| `@types/pg` | 8.23.1 | `backend/package.json` | devDependencies |
| `tsx` | 4.23.15 | `backend/package.json` | devDependencies |
| `typescript` | 5.9.3 | `backend/package.json` | devDependencies |
