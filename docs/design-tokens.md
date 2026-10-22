# 디자인 토큰

<!-- 자동 생성 파일. 수정은 design/tokens.json에서 하고 `npm run docs` 로 다시 생성한다. -->

8개 앱이 함께 쓰는 값이다. 이름은 shadcn/ui와 Tailwind CSS 4 규칙을 따른다([ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)). 앱마다 다른 값은 이름과 테마 색(`primary`, `primary-foreground`, `ring`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-ring`)뿐이다.

## 글꼴

- 본문·제목: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
- 고정폭: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- Pretendard 1.3.9 (2023-11-05), SIL Open Font License 1.1. 공식 릴리스 zip의 PretendardVariable.woff2(가변 폰트 전체, 2.0MB) 하나를 @sirloinbh/design-tokens 패키지에 넣어 직접 제공한다. 외부 CDN을 쓰지 않는다(오프라인·PWA 동작, 외부 의존 없음). 동적 서브셋은 npm 패키지·CDN으로만 배포되어 쓰지 않는다. `font-display: swap`.

## 글자 크기

| 이름 | 크기 | 줄 높이 | 쓰는 곳 |
|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem | 메타 정보(시간, 개수) |
| `text-sm` | 0.875rem (14px) | 1.25rem | 보조·주석 텍스트, 표, 폼 설명 |
| `text-base` | 1rem (16px) | 1.6 | 본문 (한국어 가독성을 위해 줄 높이 1.6) |
| `text-lg` | 1.125rem (18px) | 1.75rem | 제목 4단계, 강조 본문 |
| `text-xl` | 1.25rem (20px) | 1.75rem | 제목 3단계 |
| `text-2xl` | 1.5rem (24px) | 2rem | 제목 2단계, 모바일 제목 1단계 |
| `text-3xl` | 1.875rem (30px) | 2.25rem | 데스크톱 제목 1단계 |

## 글자 굵기

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| `font-normal` | 400 | 본문 |
| `font-medium` | 500 | 버튼, 메뉴, 라벨 |
| `font-semibold` | 600 | 제목 2–4단계, 카드 제목 |
| `font-bold` | 700 | 제목 1단계, 숫자 강조 |

## 글자 스타일 (제목 단계, 본문, 주석)

모바일 크기가 기본이고, `md`(768px) 이상에서 오른쪽 크기로 커진다.

| 스타일 | 요소 | 모바일 | md 이상 | 굵기 | 자간 | 색 | 쓰는 곳 |
|---|---|---|---|---|---|---|---|
| `h1` | `h1` | 24px | 30px | 700 | -0.02em | `foreground` | 페이지 제목. 페이지마다 하나 |
| `h2` | `h2` | 20px | 24px | 600 | -0.02em | `foreground` | 섹션 제목 |
| `h3` | `h3` | 18px | 20px | 600 | -0.01em | `foreground` | 카드·하위 섹션 제목 |
| `h4` | `h4` | 16px | 18px | 600 | 0 | `foreground` | 작은 묶음 제목 |
| `body` | `p` | 16px | 16px | 400 | 0 | `foreground` | 본문 |
| `body-sm` | `p` | 14px | 14px | 400 | 0 | `foreground` | 표, 좁은 영역의 본문 |
| `caption` | `p` | 14px | 14px | 400 | 0 | `muted-foreground` | 보조·주석 텍스트, 입력란 설명 |
| `meta` | `span` | 12px | 12px | 400 | 0 | `muted-foreground` | 날짜·시간·개수 같은 메타 정보 |

## 간격

- 간격은 4px 단위(Tailwind spacing 1 = 4px)만 쓴다. 자주 쓰는 값: 1(4px), 2(8px), 3(12px), 4(16px), 6(24px), 8(32px), 12(48px).

| 이름 | 모바일 | md | lg | 쓰는 곳 |
|---|---|---|---|---|
| `page-x` | 1rem | 1.5rem | 2rem | 페이지 좌우 여백 |
| `section-gap` | 1.5rem | 2rem | 2rem | 섹션 사이 간격 |
| `stack-gap` | 0.75rem | 1rem | 1rem | 카드·폼 항목 사이 간격 |
| `content-max` | 100% | 48rem | 72rem | 본문 최대 너비 |

## 모서리 둥글기

| 이름 | CSS 변수 | 값 | px | 쓰는 곳 |
|---|---|---|---|---|
| `rounded-base` | `--radius` | `0.625rem` | 10 | 기준값 (shadcn/ui --radius) |
| `rounded-sm` | `--radius-sm` | `calc(var(--radius) - 4px)` | 6 | 배지, 작은 입력 요소 |
| `rounded-md` | `--radius-md` | `calc(var(--radius) - 2px)` | 8 | 버튼, 입력란 |
| `rounded-lg` | `--radius-lg` | `var(--radius)` | 10 | 카드, 메뉴 |
| `rounded-xl` | `--radius-xl` | `calc(var(--radius) + 4px)` | 14 | 모달, drawer |

## 그림자와 테두리

| 이름 | 쓰는 곳 |
|---|---|
| `shadow-xs` | 입력란 |
| `shadow-sm` | 카드 |
| `shadow-md` | 드롭다운 메뉴, 팝오버 |
| `shadow-lg` | 모달, drawer |

- 테두리는 1px, 색은 border(구분선)와 input(입력란)만 쓴다.

## 반응형

- 모바일 우선. 기본 스타일은 360px 너비 기준으로 쓰고, 넓은 화면은 md·lg 접두어로 더한다. 가장 좁은 화면은 360px이다.
- 터치 기기(pointer: coarse)에서 누를 수 있는 요소는 가로·세로 최소 44px. 보이는 크기가 작으면 여백으로 누르는 영역을 넓힌다.
- 고정 헤더·하단 탭·drawer는 env(safe-area-inset-*)만큼 안쪽 여백을 둔다(viewport-fit=cover와 함께).
- 변경한 화면은 390×844(모바일)와 1440×900(PC)에서 확인한다.

| 기준점 | 최소 너비 | 쓰는 곳 |
|---|---|---|
| `sm` | 40rem (640px) | 큰 휴대폰 가로 |
| `md` | 48rem (768px) | 태블릿. 이 너비부터 LNB가 사이드바로 고정되고, 그보다 좁으면 drawer로 열린다 |
| `lg` | 64rem (1024px) | 작은 노트북 |
| `xl` | 80rem (1280px) | 데스크톱 |

## 아이콘 크기

| 이름 | px | 쓰는 곳 |
|---|---|---|
| `sm` | 16 | 버튼·입력란 안 |
| `md` | 20 | 메뉴, 목록 |
| `lg` | 24 | 빈 상태, 강조 |

## 쌓임 순서 (z-index)

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| `base` | 0 |  |
| `sticky` | 10 | 고정 헤더, 하단 탭 |
| `drawer` | 40 | LNB drawer, Sheet |
| `modal` | 50 | Dialog와 그 배경 (shadcn/ui 기본) |
| `popover` | 60 | 드롭다운 메뉴, 팝오버 (모달 위에서도 열림) |
| `toast` | 70 | Sonner 토스트 |

## 움직임

- 빠름 150ms, 보통 200ms, 느림 300ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- hover·focus는 fast, 메뉴·토스트는 normal, 모달·drawer는 slow. prefers-reduced-motion이면 애니메이션을 끈다.

## 로딩 표시

- 스켈레톤: shadcn/ui Skeleton(bg-accent, animate-pulse). 실제 내용과 같은 크기·모양(텍스트 줄, 카드, 목록)으로 그린다. 처음 불러오는 화면에 쓴다.
- 스피너: lucide-react Loader2Icon + animate-spin. 크기는 icon sm·md·lg. 버튼 안 저장 중 표시와 짧은 대기에 쓴다.
- 300ms 안에 끝나는 작업은 로딩 표시를 하지 않는다. 화면 전체를 가리는 로딩은 쓰지 않는다.

## 색

값은 oklch이다. `theme`은 앱별 테마 색에서 만든다. 앱마다 다른 색은 primary, primary-foreground, ring, sidebar-primary, sidebar-primary-foreground, sidebar-ring 6개뿐이다. 값은 레지스트리의 앱별 테마 색(#122)에서 만든다. 나머지 색은 모든 앱이 같다.

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--background` | `oklch(1 0 0)` | 페이지 배경 |
| `--foreground` | `oklch(0.145 0 0)` | 기본 글자 |
| `--card` | `oklch(1 0 0)` | 카드 배경 |
| `--card-foreground` | `oklch(0.145 0 0)` | 카드 글자 |
| `--popover` | `oklch(1 0 0)` | 메뉴·팝오버·모달 배경 |
| `--popover-foreground` | `oklch(0.145 0 0)` | 메뉴·팝오버 글자 |
| `--primary` | 앱 테마 | 앱 테마 색. 주 버튼, 링크, 선택 상태 (레지스트리 brand.themeColor, #122) |
| `--primary-foreground` | 앱 테마 | 테마 색 위의 글자 (레지스트리 brand.onThemeColor, #122) |
| `--secondary` | `oklch(0.97 0 0)` | 보조 버튼 배경 |
| `--secondary-foreground` | `oklch(0.205 0 0)` | 보조 버튼 글자 |
| `--muted` | `oklch(0.97 0 0)` | 비활성·옅은 면 |
| `--muted-foreground` | `oklch(0.556 0 0)` | 보조·주석 텍스트 (흰 배경 대비 4.5:1 이상) |
| `--accent` | `oklch(0.97 0 0)` | hover·선택된 메뉴 배경 |
| `--accent-foreground` | `oklch(0.205 0 0)` | hover·선택된 메뉴 글자 |
| `--destructive` | `oklch(0.577 0.245 27.325)` | 삭제·오류 |
| `--success` | `oklch(0.527 0.154 150.069)` | 성공·완료 (Tailwind green-700, 흰 글자 대비 4.5:1 이상) |
| `--success-foreground` | `oklch(1 0 0)` | 성공 색 위의 글자 |
| `--warning` | `oklch(0.828 0.189 84.429)` | 주의 (Tailwind amber-400) |
| `--warning-foreground` | `oklch(0.279 0.077 45.635)` | 주의 색 위의 글자 (Tailwind amber-950) |
| `--border` | `oklch(0.922 0 0)` | 구분선, 카드 테두리 |
| `--input` | `oklch(0.922 0 0)` | 입력란 테두리 |
| `--ring` | 앱 테마 | 키보드 포커스 표시 (테마 색 기반) |
| `--sidebar` | `oklch(0.985 0 0)` | LNB 배경 |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | LNB 글자 |
| `--sidebar-primary` | 앱 테마 | LNB 선택 항목 강조 |
| `--sidebar-primary-foreground` | 앱 테마 | LNB 선택 항목 글자 |
| `--sidebar-accent` | `oklch(0.97 0 0)` | LNB hover 배경 |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | LNB hover 글자 |
| `--sidebar-border` | `oklch(0.922 0 0)` | LNB 구분선 |
| `--sidebar-ring` | 앱 테마 | LNB 포커스 표시 |

다크 모드는 아직 정하지 않았다. 도입할 때 이 파일에 dark 목록을 추가한다.

## workout-memo 기존 토큰 대응표

workout-memo의 기존 토큰(frontend/src/theme.css)이 새 토큰 중 무엇에 해당하는지. 디자인 시스템 적용(#126) 때 이 표대로 바꾼다.

| 기존 | 새 토큰 | 비고 |
|---|---|---|
| `--color-primary` | --primary | 운동 앱 테마 색이 된다(#122) |
| `--color-on-primary` | --primary-foreground |  |
| `--color-accent` | --primary (옅게) 또는 차트 색 | shadcn/ui의 accent는 hover 배경이라 의미가 다르다 |
| `--color-focus` | --ring |  |
| `--color-ink` | --foreground |  |
| `--color-ink-muted` | --muted-foreground |  |
| `--color-ink-subtle` | --muted-foreground | 두 단계를 하나로 합친다 |
| `--color-link` | --primary | 링크는 테마 색 |
| `--color-icon` | --muted-foreground |  |
| `--color-surface-sidebar` | --sidebar |  |
| `--color-surface-modal` | --popover |  |
| `--color-line / --color-line-soft` | --border | 두 단계를 하나로 합친다 |
| `--color-line-input` | --input |  |
| `--color-backdrop` | 모달 배경 bg-black/50 | shadcn/ui Dialog 기본 |
| `--color-nav-active / -ink` | --sidebar-accent / --sidebar-accent-foreground |  |
| `--color-subtle / -line / -ink` | --secondary / --border / --secondary-foreground |  |
| `--color-danger / -ink` | --destructive |  |
| `--color-danger-surface / -line` | --destructive을 10% / 30% 투명도로 | bg-destructive/10, border-destructive/30 |
| `--radius-sm 5px, md 6px, lg 9px, xl 12px` | 6px, 8px, 10px, 14px | shadcn/ui 기준값 --radius 10px에서 계산 |
| `--shadow-card / --shadow-modal` | shadow-sm / shadow-lg | Tailwind 기본 그림자 |
| `글꼴 DM Sans, Noto Sans KR` | Pretendard Variable |  |
