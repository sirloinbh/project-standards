# #126 8개 앱 모두 공통 UI 동기화 켜기

workout-memo(#160) 다음으로 나머지 7개 앱이 공통 디자인 시스템으로 화면을 바꿨다(study-log#111, health-log#13, life-journal#11, money-ledger#11, english-study#11, plan-routine#28, dev-career-portfolio#11). 8개 앱이 모두 `@sirloinbh/design-tokens`를 설치했다.

## 변경

| 파일 | 내용 |
|---|---|
| `registry/projects.json` | 7개 앱의 `features.ui`·`features.vitest` → `true` |
| `sync.config.json` | app 프로필 `packages`에 `@sirloinbh/design-tokens`를 다시 넣음(#211에서 뺐던 것) |
| `templates/index.json` | `frontend/package.json` 필드에 `dependencies.@sirloinbh/design-tokens` |
| `scripts/test/fixtures/sync-snapshot.json` | 7개 앱이 받는 파일에 공통 UI·`vitest.config.ts` 37개씩(259개) 추가 |
| `scripts/test/*.test.mjs` | study-log를 "기능이 꺼진 앱" 예로 쓰던 테스트는 기능을 끈 사본을 쓰고, 공유 패키지 4개·프론트엔드 필드 기대값을 갱신 |
| `docs/ui-components.md`, `docs/design-system.md` | 8개 앱 모두 켜짐, 가짜 React 테스트 전환 방법 |

## 정한 것

- 7개 앱 PR에 동기화 미리보기와 같은 공통 파일을 먼저 넣고 병합한 뒤 이 PR을 병합한다. 병합 뒤 8개 앱의 동기화 PR에는 manifest 갱신만 남는다(#234로 manifest만 바뀐 경우도 PR이 열림).
- `@sirloinbh/design-tokens`는 앱이 런타임 CSS로 쓰므로 `devDependencies`가 아니라 `dependencies` 필드로 관리한다(스캐폴드와 같음).

## 검증

- `npm run check`: 통과(테스트 415개 중 414개 통과, 1개 건너뜀, 실패 0)
- 7개 앱의 병합된 브랜치를 `--local`로 넣은 동기화 미리보기: 공통 파일과 필드가 모두 같고, 바뀌는 것은 `.standards/manifest.json`뿐
