# #33 테스트 설정 템플릿 (Playwright, Vitest)

## 변경

| 파일 | 내용 |
|---|---|
| `templates/e2e/playwright.config.ts.tmpl` | workout-memo `playwright.config.ts` 기준. e2e API·웹 포트를 레지스트리 `ports.e2eApi`·`ports.e2eWeb`로 채운다 |
| `templates/vitest/frontend/vitest.config.ts.tmpl` | workout-memo `frontend/vitest.config.ts`와 같은 내용(jsdom, `src/**/*.test.{ts,tsx}`, `src/test/setup.ts`, `TZ=UTC`) |
| `registry/projects.schema.json`, `projects.json` | `features.vitest` 추가. workout-memo만 `true`. `features.e2e`에 설명 추가 |
| `sync.config.json` | `featureTemplates`에 `e2e`, `vitest` 폴더 추가 |
| `templates/app/.prettierignore` | 두 설정 파일 추가(#154 규칙) |
| `scaffold/app/playwright.config.ts`, `scaffold/app/frontend/vitest.config.ts` | 삭제. 같은 파일을 이제 템플릿이 만든다(스캐폴드는 중앙 관리 파일도 함께 렌더링한다) |
| `docs/test-config.md` | 템플릿이 기대하는 것, 다른 앱이 도입할 때 필요한 의존성 목록, 앱에 켜는 순서 |
| `scripts/test/test-config.test.mjs` | 테스트 5개. 8개 앱 모두 e2e API·웹 포트가 들어가는지, 플래그가 켜진 앱에만 계획에 들어가는지, 의존성 목록 버전이 스캐폴드와 같은지 |
| `scripts/test/sync.test.mjs` 스냅샷, `templates.test.mjs`, `scaffold.test.mjs` | workout-memo에 두 파일 추가, #154 검사에 새 폴더 포함, 슬롯 99 가상 프로젝트에 `vitest: true` |
| `README.md`, `docs/design.md` 6.6 | 문서 링크, 새 프로젝트는 `features.e2e`·`vitest`·`ui`를 켜고 등록 |

## 결정

- **적용 조건은 레지스트리 기능 플래그다.** Playwright는 이미 있던 `features.e2e`(CI e2e 작업도 같은 값)를 쓴다. Vitest를 쓰는 앱도 workout-memo뿐이라 `features.vitest`를 새로 만들었다. 의존성이 없는 앱에 설정 파일을 넣으면 `vitest/config`, `@playwright/test`를 찾지 못해 타입 검사가 깨진다. `features.ui`(#123)와 같은 방식이다.
- **workout-memo의 화면 비교 설정을 템플릿에 남겼다.** `E2E_VISUAL`, `snapshotPathTemplate`, `updateSnapshots`, `expect.toHaveScreenshot`은 화면 비교 테스트가 없는 앱에서는 아무 영향이 없다. 빼면 첫 동기화가 workout-memo의 화면 비교를 깨뜨린다. workout-memo와 다른 점은 관리 헤더와 주석 세 줄(포트 출처 안내 추가, 앱 이슈 번호 `#113`과 `workout-testing` 스킬 언급 제거)뿐이다.
- **스캐폴드 사본을 지웠다.** 같은 파일의 원본이 두 곳이면 어긋난다. 스캐폴드는 `planTarget`으로 중앙 관리 파일을 함께 쓰므로, 플래그를 켠 새 프로젝트는 템플릿에서 같은 파일을 받는다. 이미 있는 8개 앱은 스캐폴드를 다시 쓰지 않는다.
- 의존성 목록의 버전은 workout-memo lockfile 설치 버전(= 스캐폴드 `package.json`)만 쓴다. 테스트가 두 곳이 같은지 검사한다. 설치는 사용자 승인 후 사용자가 한다.

## 검증

- `npm run check` 통과: 테스트 171개(통과 170, 건너뜀 1, 실패 0), `registry-check: ok`, `docs/projects.md: up to date`, `package-guard: ok`, `check-workflows: ok`.
- 렌더링 결과를 workout-memo의 현재 두 파일(API로 읽음)과 비교했다. `vitest.config.ts`는 헤더 말고 같고, `playwright.config.ts`는 위에 적은 주석만 다르다. 포트 3201·5301은 같다.
