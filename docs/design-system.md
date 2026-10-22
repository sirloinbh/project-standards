# 디자인 시스템 (공통부)

8개 앱이 함께 지키는 화면 규칙이다. 값은 [design-tokens.md](design-tokens.md), 결정 근거는 [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)과 [ADR-0008](adr/0008-neutral-light-dark.md)에 있다. 앱마다 다른 것은 **표시 이름뿐**이다. 색은 8개 앱 모두 같은 흑백이고, 라이트·다크 두 모드를 지원한다.

## 토큰 쓰는 법

- 앱 메인 CSS에서 `@sirloinbh/design-tokens/tailwind.css`를 불러온다. Tailwind가 없는 앱은 `tokens.css`만 불러온다. 사용 예는 패키지 README에 있다.
- 색은 토큰 이름으로 쓴다: `bg-primary`, `text-muted-foreground`, `border-border`. 색 코드를 직접 쓰지 않는다.
- 토큰(색, 글꼴, 크기, 간격, 모서리, 그림자)은 앱에서 덮어쓰지 않는다. 바꿔야 하면 중앙 리포의 `design/tokens.json`을 고친다.
- 다크 모드는 토큰이 처리한다. 색을 모드별로 따로 쓰지 말고 토큰 이름만 쓴다. 꼭 필요할 때만 `dark:` 유틸리티를 쓴다.

## 라이트·다크 모드

- 기본은 시스템 설정(`prefers-color-scheme`)을 따른다.
- 사용자가 모드를 고르면 그 선택을 저장(`localStorage`)하고 `<html>`에 `light` 또는 `dark` 클래스를 붙인다. 첫 화면에서 색이 바뀌어 깜빡이지 않도록, 클래스를 붙이는 스크립트는 `<head>`에서 가장 먼저 실행한다(#124).
- 클래스가 없으면 시스템 설정을 따르므로, 스크립트가 꺼져 있어도 맞는 색이 나온다.

## 컴포넌트

1. 새 화면 요소는 `frontend/src/components/ui/`의 shadcn/ui 컴포넌트를 먼저 쓴다. 이 폴더는 중앙 관리 파일이다. 목록과 앱에 켜는 방법은 [공통 UI 컴포넌트](ui-components.md)에 있다(#123).
2. 공통 컴포넌트에 없는 것이 필요하면 앱 고유 폴더(`frontend/src/components/`)에 만든다. 여러 앱에 필요해지면 중앙 리포에 이슈를 연다.
3. 레이아웃(상단 메뉴, LNB, footer, 모달, drawer, 메뉴)은 [공통 레이아웃](layout.md)(#124)을 쓴다.

## 글자

- 제목은 `h1`–`h4` 요소를 쓴다. 기본 스타일이 적용된다. `h1`은 페이지마다 하나다.
- 본문은 `text-body`, 좁은 영역은 `text-body-sm`을 쓴다.
- 보조·주석 텍스트는 `text-caption`, 날짜·개수 같은 메타 정보는 `text-meta`를 쓴다.

## 아이콘과 이모지

- 아이콘은 `lucide-react`만 쓴다. 의미 있는 아이콘 버튼에는 `aria-label`을 단다.
- 이모지는 Fluent Emoji Flat SVG를 `<img>`로 쓴다. 문자 이모지는 쓰지 않는다. 의미가 있으면 `alt`에 한국어 설명을, 장식용이면 `alt=""`를 쓴다.

## 로딩 표시

- 처음 불러오는 화면: 실제 내용과 같은 모양의 Skeleton
- 버튼 안 저장 중, 짧은 대기: `Loader2Icon` 스피너
- 300ms 안에 끝나는 작업은 표시하지 않는다. 화면 전체를 가리는 로딩은 쓰지 않는다.

## 반응형과 접근성

- 모바일 우선으로 작성한다. 가장 좁은 화면은 360px이다. `md`(768px) 이상에서 LNB가 사이드바로 바뀐다.
- 터치 기기에서 누를 수 있는 요소는 44×44px 이상이다.
- 키보드만으로 메뉴·모달·drawer를 열고 닫을 수 있어야 한다. 포커스 표시(`ring`)를 지우지 않는다.
- 화면을 바꾸면 390×844(모바일)와 1440×900(PC)에서 확인하고 결과를 PR에 적는다.
- 화면 구조를 크게 바꿀 때는 전후로 [UX·접근성 점검](conventions/ux-audit.md)을 한다.

## 기존 앱 전환

workout-memo의 기존 토큰(`--color-ink` 등)이 새 토큰 중 무엇에 해당하는지는 [design-tokens.md](design-tokens.md)의 대응표에 있다. 전환은 #126에서 앱별로 한다.
