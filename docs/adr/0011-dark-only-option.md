# 0011. 앱별로 다크 모드를 고정할 수 있는 옵션 두기

- 상태: 채택 (이슈 #354)
- 날짜: 2026-10-31
- 바꾸는 결정: [ADR-0008](0008-neutral-light-dark.md) 중 "모든 앱이 라이트·다크 두 모드를 지원한다"

## 맥락

- workout-memo 사용자가 다크 모드만 쓰기로 정했다(workout-memo#98, 2026-10-30).
- 화면 모드를 정하는 파일(`theme-init.js`, `theme.ts`, `AppShell`, `ThemeToggle`)은 모두 중앙 관리 파일이라 앱에서 고칠 수 없다.
- 앱에서 `index.html`에 `dark` 클래스만 넣으면 메뉴로 라이트로 바꿀 수 있어서 "다크만"이 되지 않는다.

## 결정

- 레지스트리에 `features.darkOnly`(boolean, 필수)를 둔다. 지금은 workout-memo만 `true`이고 나머지 7개 앱은 `false`다.
- `darkOnly` 앱은 다음과 같이 동작한다.
  - `theme-init.js`가 저장값과 관계없이 `<html>`에 `dark` 클래스를 붙인다.
  - `readTheme()`는 항상 `dark`를 돌려준다.
  - `AppShell`이 화면 모드 메뉴를 그리지 않는다.
  - PWA manifest의 `background_color`와 `theme_color`는 `#0a0a0a`다.
- 색은 공통 다크 토큰을 그대로 쓴다. 토큰은 바꾸지 않는다.
- 앱 코드는 새 중앙 관리 파일 `frontend/src/lib/theme-config.ts`의 `DARK_ONLY`로 값을 읽는다.

## 결과

- ADR-0008의 나머지 결정은 그대로다. 8개 앱은 같은 흑백 토큰을 쓰고, 앱별 테마 색은 없다.
- 앱마다 다를 수 있는 것은 표시 이름과 이 옵션이다.
- `darkOnly`를 켠 앱은 동기화 PR에서 모든 화면이 바뀐다. 시각 기준선 갱신과 다크 대비 수정을 그 PR에 함께 해야 한다.
- 모든 앱이 `theme-config.ts`와 템플릿으로 만든 `theme-init.js`를 받는다. `false`인 앱의 동작은 그대로다.
