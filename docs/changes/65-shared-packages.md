# #65 공유 설정 패키지 4종과 패키지 검사

## 변경

| 파일 | 내용 |
|---|---|
| `packages/eslint-config/` | `createConfig(plugins, options)` 팩토리. 패키지는 아무것도 import하지 않고, 앱이 설치한 플러그인을 인자로 받는다. peer 6개를 정확한 버전으로 고정 |
| `packages/prettier-config/` | 8개 앱의 현재 `.prettierrc.json`과 같은 설정 |
| `packages/tsconfig/` | `base`, `react-app`(frontend), `node-api`(backend). 현재 compilerOptions와 같음. peer `typescript` 5.9.3 |
| `packages/design-tokens/` | `tokens.css`(CSS 변수, Tailwind 불필요), `tailwind.css`(Tailwind 4 테마 + h1–h4 기본 스타일 + `text-body`·`text-body-sm`·`text-caption`·`text-meta` 유틸리티), Pretendard Variable 1.3.9 |
| `scripts/build-tokens.mjs` | `design/tokens.json`에서 두 CSS 파일을 생성(`--check` 지원). 앱 테마 색 6개는 중립색 기본값을 두고 앱 CSS에서 덮어쓴다 |
| `scripts/package-guard.mjs` | 의존성 0개, 설치 스크립트 금지, 정확한 버전(peer 포함), 공개 패키지, GitHub Packages 레지스트리, `files` 존재, CHANGELOG 항목, 태그와 버전 일치(`--tag`) |
| `templates/app/eslint.config.mjs.tmpl`, `.prettierrc.json.tmpl`, `frontend/tsconfig.json.tmpl`, `backend/tsconfig.json.tmpl` | 하위 리포 진입 파일. 패키지를 불러오기만 한다 (#52에서 옮겨 옴) |
| `templates/app/.npmrc.tmpl` ×3 | `@sirloinbh` 레지스트리와 `${NODE_AUTH_TOKEN}` 줄 추가 (#52에서 옮겨 옴) |
| `package.json` | `tokens`, `tokens:check`, `packages:check`. `npm run check`에 포함 |
| `scripts/test/packages.test.mjs`, `fixtures/study-log/*`, `fixtures/sync-snapshot.json` | 테스트 7개, study-log 현재 설정 파일 4개, 하위 리포 파일 목록(앱마다 4개 추가) |

## Pretendard

- **출처:** 공식 릴리스 `Pretendard-1.3.9.zip`(SHA-256 `04be351a…428a`). 새 빈 폴더에 내려받은 뒤, 파일 두 개만 꺼냈다: `web/variable/woff2/PretendardVariable.woff2`(2.0MB), `LICENSE.txt`.
- **라이선스:** LICENSE 원문에서 SIL Open Font License 1.1임을 확인했다. 패키지 `LICENSE.md`에 고지했다.
- **동적 서브셋을 쓰지 않은 이유:** 원래 #121에서는 동적 서브셋을 쓰려고 했다. 하지만 공식 zip에는 동적 서브셋이 없고 npm 패키지와 CDN으로만 배포된다. 그래서 가변 폰트 전체 파일 하나를 쓰기로 바꿨다. `design/tokens.json`의 설명과 파일 해시도 갱신했다.

## 다음 단계로 넘긴 것

- 앱 `package.json`에 `@sirloinbh/*` devDependencies를 넣는 필드 관리는 패키지가 실제로 배포된 뒤 workout-memo 첫 동기화(#97)에서 한다. 지금은 `versions.json`의 패키지 버전이 `null`(미배포)이다.
- `.npmrc`의 `${NODE_AUTH_TOKEN}` 줄이 적용되면, 이 환경변수가 없는 PC에서 npm 명령이 실패한다. 첫 동기화 PR 본문에 설정 방법을 적어야 한다(#97).

## 검증

- `npm run check`: 테스트 92개 통과, `registry-check: ok`, 생성 문서 2개·토큰 CSS 2개 최신, `package-guard: ok`
- **study-log 현재 파일과 비교:**
  - ESLint 규칙, Prettier 설정, frontend tsconfig는 study-log 현재 파일과 같다.
  - backend tsconfig는 `outDir`만 `${configDir}/dist`다. 상속받는 쪽 기준 경로라서 실제 결과는 기존과 같은 `backend/dist`다.
- **Tailwind 컴파일:** workout-memo에 이미 설치된 Tailwind 4.3.3(`@tailwindcss/node`)으로 `tailwind.css`를 실제로 컴파일했다. 다음 8개 항목이 모두 기대대로 나왔다: `bg-primary`, `rounded-lg`/`rounded-sm`, `text-caption`, `@font-face`, h1 기본 스타일, `md` 기준점(48rem), `bg-success`. 새로 설치한 패키지는 없다.
