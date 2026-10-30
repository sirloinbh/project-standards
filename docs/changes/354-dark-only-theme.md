# #354 앱별 다크 모드 고정 옵션 (registry darkOnly)

- 이슈: [#354](https://github.com/sirloinbh/project-standards/issues/354)
- 브랜치: `feat/354-dark-only-theme` (main `83b6d06`에서 시작)
- 상태: **진행 중(draft PR)**. 코드·테스트는 끝났고, 문서(ADR·설계 문서) 정리가 남았다.

## 배경 — 2026-10-30

- workout-memo 사용자가 UI 기준(workout-memo#98)을 정했다.
  - 다크 모드만 쓴다. 라이트·시스템 선택은 없앤다.
  - 색은 공통 다크 토큰(바탕 `#0a0a0a`, 카드 `#171717`)을 그대로 쓴다. 토큰은 바꾸지 않는다.
  - 새 npm 패키지 도입은 허용했지만, shadcn/ui·`radix-ui`가 이미 설치돼 있어 들일 것이 없다.
- 화면 모드를 정하는 파일(`theme-init.js`, `theme.ts`, `AppShell`, `ThemeToggle`)이 모두 중앙 관리 파일이다. 그래서 앱이 아니라 중앙에서 앱별 옵션으로 만든다.
- 사용자는 "앱에서 기본값만 다크로" 하는 방식 대신, 중앙에 앱별 고정 옵션을 두는 방식을 골랐다.

## 변경 (지금까지)

| 파일 | 내용 |
|---|---|
| `registry/projects.schema.json`, `registry/projects.json` | `features.darkOnly`(boolean, 필수)를 추가했다. workout-memo만 `true`, 나머지 7개 앱은 `false` |
| `scripts/lib/vars.mjs` | 템플릿 변수 `theme.color`를 추가했다. `darkOnly`면 `#0a0a0a`, 아니면 `#ffffff` |
| `templates/app/frontend/public/manifest.webmanifest.tmpl` | `background_color`·`theme_color`가 `{{theme.color}}`를 쓴다 |
| `templates/ui/frontend/public/theme-init.js` → `theme-init.js.tmpl` | `darkOnly`면 저장값과 관계없이 `<html>`에 `dark`를 붙이고 끝낸다 |
| `templates/ui/frontend/src/lib/theme-config.ts.tmpl` (신규) | 앱 코드가 읽는 `DARK_ONLY` 값 |
| `templates/ui/frontend/src/lib/theme.ts` | `DARK_ONLY`면 `readTheme()`가 항상 `dark` |
| `templates/ui/frontend/src/components/layout/app-shell.tsx` | `DARK_ONLY`면 화면 모드 메뉴(`ThemeToggle`)를 그리지 않는다 |
| `templates/ui/.../app-shell.test.tsx`, `lib/theme.test.ts` | 기존 모드 전환 테스트는 `skipIf(DARK_ONLY)`로 바꿨다. 다크 전용 앱에는 "메뉴 없음", "항상 dark" 테스트가 돈다(`runIf`) |
| `templates/app/.prettierignore.tmpl` | 새 중앙 관리 파일 `frontend/src/lib/theme-config.ts` 추가 |
| `scripts/test/dark-only.test.mjs` (신규), `scripts/test/scaffold.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | 앱별 렌더링 값 검사, scaffold 고정값, 하위 리포 파일 목록 스냅샷 |

## 검증 — 2026-10-30

- `node --test scripts/test/dark-only.test.mjs`: 3 pass
- `UPDATE_SNAPSHOT=1 npm test`: 처음에 1 fail이었다. 새 파일이 `.prettierignore` 템플릿에 없었기 때문이다. 추가한 뒤 통과했다.
- `npm run check`: 506 tests, 505 pass, 0 fail
- 템플릿 안의 화면 테스트(`*.test.tsx`, `theme.test.ts`)는 중앙에서 돌지 않는다. 동기화 PR을 받은 앱의 CI에서 확인해야 한다(아직 안 함).

## 앞으로 할 일

### 이 PR에서 (중앙)

- [ ] ADR-0011 "앱별 다크 고정 옵션"을 쓴다. ADR-0008(흑백 라이트·다크 통일) 중 "모든 앱이 두 모드 지원" 부분을 바꾼다는 점과 이유를 적는다.
- [ ] `docs/design-system.md`를 고친다.
  - 첫 문단의 "앱마다 다른 것은 표시 이름뿐"
  - "라이트·다크 모드" 절에 `darkOnly`
- [ ] `docs/layout.md`(`theme-init.js` 설명), `docs/pwa.md`(manifest 색이 `darkOnly`면 `#0a0a0a`)를 고친다.
- [ ] `npm run sync:preview`로 workout-memo와 다른 앱 1개의 결과 파일을 직접 확인한다.
- [ ] 문서까지 끝나면 `npm run check`를 다시 돌리고, draft를 해제해 병합한다(중앙 리포는 에이전트가 병합).

### 병합 후 (workout-memo, [#184](https://github.com/sirloinbh/workout-memo/issues/184))

- [ ] 동기화 PR(`chore/standards-sync-*`)을 확인한다. 이 리포 규칙상 동기화 PR은 사용자가 병합한다.
- [ ] 동기화 PR에서 CI `e2e-visual`이 실패할 것으로 예상한다. 모든 화면이 다크로 바뀌기 때문이다.
  - 시각 기준선 44장을 `visual-baselines` 아티팩트로 갱신하고 전후 화면을 확인한다.
  - 다크에서 나오는 axe 대비 위반을 고친다. 라이트 전용 허용 항목은 `e2e/a11y-known-contrast.json`에서 지운다.
  - `style.css`에서 흰 바탕을 가정한 규칙을 고친다.
  - 위 커밋들은 그 동기화 PR에 더한다. 그동안 중앙 main에는 병합하지 않는다(#114 규칙).
- [ ] workout-memo `frontend/index.html`의 `theme-color` 메타를 다크(`#0a0a0a`) 하나로 바꾼다(앱 관리 파일).
- [ ] workout-memo `docs/design-system.md`에 "다크 전용"과 그 이유를 적는다.

### 사용자 단계

- [ ] workout-memo#98 닫기. 결정 기록은 코멘트로 남겼다. 에이전트가 이슈를 닫는 동작은 권한 정책에 막혔다.
- [ ] workout-memo 운영 배포 확인(#123 병합 커밋 `2239199`): 서버에서 `cat /opt/workout-memo/.deployed`. 에이전트의 SSH 접속은 권한 정책에 막혔다.

## 제한

- `darkOnly` 앱은 `theme-init.js`가 실행되기 전 아주 짧은 순간에만 시스템 설정 색을 따를 수 있다. 스크립트가 `<head>` 맨 위에서 동기 실행되므로 실제로 보이는 깜빡임은 없을 것으로 본다. 다만 아직 확인하지 않았다.
