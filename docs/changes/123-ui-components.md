# #123 기본 UI 컴포넌트 세트 (shadcn/ui, 스켈레톤, 로딩 스피너)

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/components/ui/` | Button, Input, Label, Checkbox, Select, Card, Badge, Sonner(토스트), Skeleton(텍스트·카드·목록), Spinner(3단계), EmptyState와 컴포넌트별 테스트 10개 파일 |
| `templates/ui/frontend/src/lib/utils.ts` | `cn()` |
| `registry/projects.schema.json`, `projects.json` | `features.ui` 추가. 8개 앱 모두 `false` |
| `sync.config.json`(+스키마), `scripts/lib/sync-plan.mjs` | `featureTemplates`: 기능이 켜진 프로젝트에만 템플릿 폴더를 더한다 |
| `templates/app/.prettierignore` | 컴포넌트 폴더와 `lib/utils.ts` (#154 규칙) |
| `scaffold/app/frontend` | `radix-ui`, `sonner`, `tw-animate-css` 의존성, `index.css`에 `tw-animate-css` |
| `docs/ui-components.md`, `docs/ui-components/*.png` | 목록, 앱에 켜는 순서, 확인 결과와 스크린샷 |
| `docs/dependency-policy.md` | radix-ui, sonner, vaul, tw-animate-css 행 |

## 결정

- **기능 플래그로 배포한다.** 컴포넌트를 바로 8개 앱에 동기화하면 radix-ui가 없는 앱의 타입 검사와 빌드가 깨진다. 그래서 `features.ui`가 켜진 앱에만 동기화하고, #126에서 앱별로 의존성을 설치하면서 켠다.
- shadcn/ui 공식 소스(Tailwind 4, `radix-ui` 통합 패키지)를 직접 옮겨 썼다(`npx shadcn` 미사용). 바꾼 점: 경로 별칭 대신 상대 경로, 터치 기기 44px(`pointer-coarse:`), 중앙 글자 유틸리티(`text-body-sm`, `text-caption`), 한국어 접근성 이름, `success`·`warning` 배지, 다크 모드 destructive 배경을 어둡게(대비 2.89 → 6 이상).
- 테스트는 `@testing-library/react`만 쓴다. `user-event`가 없는 앱에서도 돌아간다.

## 검증

- 중앙 `npm run check` 통과(157개). 기능이 켜졌을 때만 컴포넌트가 계획에 들어가는지 검사를 추가했다.
- 사용자 승인(2026-10-22)을 받아 `radix-ui@1.7.0 sonner@2.0.8 vaul@1.1.2 tw-animate-css@1.4.0`을 작업용 임시 폴더에 `--ignore-scripts`로 설치했다(설치 스크립트 없음 확인, `ioc-scan` 의심 항목 없음). 리포에는 설치하지 않았다.
- 결과는 [ui-components.md](../ui-components.md)의 "확인한 결과": 테스트 23개, tsc, ESLint, 대비, 터치 크기, 키보드, 가로 넘침.
