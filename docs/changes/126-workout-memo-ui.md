# #126 workout-memo에 공통 UI 켜기

workout-memo가 공통 디자인 시스템으로 화면을 바꿨다(workout-memo#159, PR workout-memo#160). 레지스트리에서 workout-memo의 `features.ui`를 켜 공통 컴포넌트·레이아웃이 동기화 대상이 되게 한다.

## 변경

| 파일 | 내용 |
|---|---|
| `registry/projects.json` | workout-memo `features.ui`: `false` → `true` |
| `scripts/test/fixtures/sync-snapshot.json` | workout-memo가 받는 파일에 `templates/ui/` 36개 추가(`UPDATE_SNAPSHOT=1`) |
| `docs/ui-components.md` | 지금 `features.ui`가 켜진 앱 |
| `docs/design-system.md` | "기존 앱 전환"에 workout-memo에서 정한 순서(공통 파일 넣기, 기존 CSS 레이어·`.legacy` 한정, 대비, 모달, 브라우저 테스트) |

## 정한 것

- 앱 PR(workout-memo#160)에 동기화 미리보기와 같은 공통 파일을 먼저 넣고, 그 PR이 병합된 뒤 이 PR을 병합한다. 그러면 workout-memo 동기화 PR에는 manifest 갱신만 남는다.
- `@sirloinbh/design-tokens`를 app 프로필 `packages`와 `frontend/package.json` 필드에 다시 넣는 일은 8개 앱이 모두 설치한 뒤에 한다(설치하지 않은 앱의 표준 검사가 실패하므로).

## 검증

- `npm run check`: 통과(테스트 414개 중 413개 통과, 1개 건너뜀, 실패 0)
- `node scripts/sync.mjs --dry-run --target sirloinbh/workout-memo --local workout-memo=<PR 브랜치>`: 공통 파일이 PR 브랜치와 같고 바뀌는 것은 `.standards/manifest.json`뿐
