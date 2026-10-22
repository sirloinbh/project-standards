# #124 공통 레이아웃과 내비게이션

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/components/ui/` | Dialog, Sheet, Drawer(vaul), DropdownMenu와 테스트 |
| `templates/ui/frontend/src/components/layout/` | `AppShell`(상단 바, LNB, 모바일 Sheet 메뉴, footer, 본문 바로가기, 안전 영역), `ThemeToggle`, 테스트 |
| `templates/ui/frontend/src/lib/theme.ts`, `public/theme-init.js` | 라이트·다크·시스템 선택 저장과 첫 화면 전 적용 |
| `templates/app/.prettierignore` | 새 관리 파일 |
| `scaffold/app/frontend` | `AppShell`·`Toaster` 사용, `theme-init.js`, `vaul`, 테스트 설정의 `matchMedia` |
| `docs/layout.md`, `docs/ui-components/layout-*.png` | 구성, 반응형 규칙, 정한 것과 이유, 적용 방법, 확인 결과 |

## 결정

- shadcn/ui Sidebar 대신 짧은 `AppShell`. NavigationMenu와 모바일 하단 탭은 쓰지 않는다(이유는 `docs/layout.md`).
- vaul Drawer의 `autoFocus` 기본값을 `true`로. Chrome 키보드 검사에서 열린 drawer 밖으로 Tab이 나가는 것을 발견했다.

## 검증

- 중앙 `npm run check` 통과.
- 가상 슬롯 99 앱: 테스트 37개, tsc, ESLint, vite build. Chrome 키보드 검사 12개, 가로 넘침 0px(360·768·1280), 대비 라이트 4.74:1·다크 6.94:1 이상.
