# #246 채택한 ESLint·Prettier 규칙을 앱에 켜기

## 변경

| 파일 | 내용 |
|---|---|
| `versions.json`, `docs/versions.md` | 루트 `devDependencies`에 `eslint-plugin-jsx-a11y-x` 0.2.0, `eslint-plugin-react-refresh` 0.5.7, `eslint-plugin-simple-import-sort` 14.0.0, `prettier-plugin-tailwindcss` 0.8.1 (앱 공통 의존성 42개) |
| `templates/app/eslint.config.mjs.tmpl` | 세 플러그인과 `tsconfigRootDir`를 `createConfig`에 넘긴다. import 순서는 새 정렬 규칙대로 |
| `templates/app/prettier.config.mjs.tmpl` | `.prettierrc.json.tmpl`을 대신한다. 공유 옵션 JSON을 불러와 `prettier-plugin-tailwindcss`와 `tailwindStylesheet`만 더한다 |
| `templates/app/.prettierignore.tmpl` | 관리 파일 목록의 `.prettierrc.json` → `prettier.config.mjs` |
| `packages/prettier-config/README.md`, `docs/design.md`, `docs/adr/0001-*.md`, `docs/tools.md`, `docs/dependency-policy.md` | 새 설정 파일 이름, 공통 의존성 수 |
| `scripts/test/fixtures/sync-snapshot.json` | 동기화 스냅샷 |

## 정한 것

- 규칙은 `@sirloinbh/eslint-config` 1.1.0에 이미 있다(#308). 패키지를 새로 배포하지 않고 앱 템플릿에서 플러그인만 넘긴다. 그래서 태그 push가 필요 없다.
- Prettier 공유 패키지는 JSON이라 플러그인을 더할 수 없다. 새 버전을 배포하는 대신 앱 설정 파일을 `prettier.config.mjs`로 바꿨다. 동기화가 손대지 않은 `.prettierrc.json`을 지운다.
- 설치 승인: #245 (2026-10-29). 네 패키지 모두 설치 스크립트가 없다.
- 공통 UI 컴포넌트 등 중앙 관리 파일도 ESLint 검사 대상이다. 위반이 있으면 앱에서 고치지 않고 중앙 `templates/`에서 고친다.

## 동기화 PR에서 할 일

동기화 PR은 앱 루트 `package.json`에 네 패키지를 더하고 lockfile은 그대로 둔다. 사용자가 그 브랜치를 받은 작업 폴더에서 `--ignore-scripts`로 설치하면(#263 knip과 한 번에), 에이전트가 이어서 한다.

1. `npm run lint`로 위반을 센다. 자동 수정(`npm run lint -- --fix`, `npm run format`)으로 import 순서와 Tailwind 클래스 순서를 고친다.
2. 남은 위반(접근성, Promise 처리, 불필요한 타입 단언)은 직접 고친다. 중앙 관리 파일의 위반은 중앙 `templates/`에서 고친다.
3. lockfile과 앱 수정을 동기화 PR 브랜치에 커밋하고, CI가 통과하면 병합한다.

## 검증

- `npm run check`: 아래 PR 본문에 기록
