# #137 lucide-react 1.x 업그레이드 검토하기

## 변경

- `docs/adr/0007-shadcn-ui-icons-emoji.md`: 의존성 표의 `lucide-react` 고정 버전을 0.468.0에서 1.52.0(2026-10-04 게시)으로 바꿨다.
- `docs/dependency-policy.md`: 메이저 버전 통일표의 `lucide-react`를 1 / 1.52.0으로 바꿨다. 앱 설치본은 아직 0.468.0이라고 적었다.
- `scaffold/app/frontend/package.json.tmpl`: 새 앱 골격의 `lucide-react`를 1.52.0으로 바꿨다.

## 결정 과정

- **0.x → 1.x 변경 내역(공식 릴리스 노트 1.0.1, lucide.dev/guide/version-1, React 마이그레이션 가이드):**
  - 브랜드 아이콘 14개 삭제(Github, Gitlab, Figma, Slack, Facebook, Instagram, LinkedIn 등).
  - UMD 빌드 삭제. ESM·CJS만 남았다.
  - 아이콘에 `aria-hidden`이 기본으로 붙는다. 의미 있는 아이콘은 `aria-label`이나 `title`을 주면 된다.
  - `LucideProvider`(기본 색·크기·선 굵기 지정)가 추가됐다. 추가 기능이라 기존 코드에 영향이 없다.
  - React peer 범위는 `^16.5.1 || ^17 || ^18 || ^19`이고, `@types/react`가 peer로 추가됐다.
- **8개 앱에서 쓰는 아이콘(각 앱 `-frontend` 리포 기본 브랜치, 2026-10-22):**
  - workout-memo: `Activity`, `ArrowRight`, `ArrowUpRight`, `Check`, `ChevronLeft`, `ChevronRight`, `Dumbbell`, `LayoutDashboard`, `NotebookPen`, `Plus`, `Settings2`, `Target`, `Trash2`, `X`
  - 나머지 7개 앱: `LayoutDashboard`, `Settings2`
  - 중앙 템플릿(`templates/ui`, `scaffold`): `CheckIcon`, `ChevronDownIcon`, `ChevronUpIcon`, `CircleIcon`, `HomeIcon`, `InboxIcon`, `Loader2Icon`, `MenuIcon`, `MonitorIcon`, `MoonIcon`, `NotebookPenIcon`, `SunIcon`, `XIcon`, 타입 `LucideIcon`
- **1.52.0에서의 영향:** 삭제된 아이콘은 없다. 브랜드 아이콘은 쓰지 않는다.
  - `Trash2`: `trash-2`가 `trash`로 합쳐져 사용 중단 별칭이 됐다. `Trash2` 이름은 그대로 export되고 모양도 같다(세로줄 두 개 있는 휴지통).
  - `HomeIcon`, `Loader2Icon`: 0.468.0 때부터 `house`, `loader-circle`의 별칭이었고 1.52.0에서도 별칭으로 남아 있다.
- **버전 선택:** 2026-10-08 이전 게시본 중 가장 새 1.52.0을 골랐다. 1.53.0은 2026-10-08 06:15(UTC)에 게시돼 기준일 당일이라 제외했다. `npm view`로 의존성 0개, 설치 스크립트(`preinstall`·`install`·`postinstall`·`prepare`) 없음, 라이선스 ISC를 확인했다.

## 검증

- 문서와 골격 템플릿 버전 문자열만 바꿨다. 패키지는 설치하지 않았다.
- `npm run check` 통과(종료 코드 0).
