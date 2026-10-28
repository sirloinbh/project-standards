# 버전 원본

<!-- 자동 생성 파일. 수정은 versions.json에서 하고 `npm run docs` 로 다시 생성한다. -->

중앙이 정하는 도구·패키지 버전이다. 바꾸는 절차는 [의존성 정책](dependency-policy.md)을 따른다.

## 도구

| 항목 | 버전 |
|---|---|
| Node | 24.21.0 |
| npm | 11.19.0 |
| PostgreSQL | 17 |
| Terraform | >= 1.6.0 (CI 1.16.5) |
| GitHub 러너 | `ubuntu-24.04` |
| 이미지 node | `node:24.21.0-alpine` |
| 이미지 nginx | `nginx:1.27-alpine` |
| 이미지 postgres | `postgres:17-alpine` |
| 이미지 devcontainerNode | `node:24.21.0-bookworm` (digest 고정) |
| 이미지 playwright | `mcr.microsoft.com/playwright:v1.63.0-noble` (digest 고정) |

## 공유 설정 패키지 (@sirloinbh)

| 패키지 | 버전 |
|---|---|
| `@sirloinbh/eslint-config` | 1.0.0 |
| `@sirloinbh/prettier-config` | 1.0.0 |
| `@sirloinbh/tsconfig` | 1.0.0 |
| `@sirloinbh/design-tokens` | 1.0.0 |

## 앱 공통 의존성

앱 8개와 스캐폴드가 같은 파일·같은 칸에 같은 버전으로 쓰는 외부 의존성이다. 앱 `package.json`의 관리 필드라서, 앱 하나만 버전이 다르면 `standards-check`가 실패한다(#304). 한 앱만 쓰는 의존성은 여기에 없다.

| 패키지 | 버전 | 파일 | 칸 |
|---|---|---|---|
| `@eslint/js` | 10.0.1 | `package.json` | devDependencies |
| `eslint` | 10.12.0 | `package.json` | devDependencies |
| `eslint-config-prettier` | 10.1.8 | `package.json` | devDependencies |
| `eslint-plugin-react-hooks` | 7.1.1 | `package.json` | devDependencies |
| `globals` | 16.5.0 | `package.json` | devDependencies |
| `prettier` | 3.9.10 | `package.json` | devDependencies |
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
| `vite` | 6.4.4 | `frontend/package.json` | devDependencies |
| `vitest` | 5.0.3 | `frontend/package.json` | devDependencies |
| `express` | 5.3.0 | `backend/package.json` | dependencies |
| `pg` | 8.23.1 | `backend/package.json` | dependencies |
| `zod` | 3.25.76 | `backend/package.json` | dependencies |
| `@types/express` | 5.0.6 | `backend/package.json` | devDependencies |
| `@types/node` | 24.19.2 | `backend/package.json` | devDependencies |
| `@types/pg` | 8.23.1 | `backend/package.json` | devDependencies |
| `tsx` | 4.23.15 | `backend/package.json` | devDependencies |
| `typescript` | 5.9.3 | `backend/package.json` | devDependencies |
