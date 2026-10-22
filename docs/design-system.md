# 디자인 시스템 (공통부)

8개 앱이 함께 지키는 화면 규칙이다. 값은 [design-tokens.md](design-tokens.md), 결정 근거는 [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)에 있다. 앱마다 다른 것은 **앱 이름과 테마 색 6개뿐**이다.

## 토큰 쓰는 법

- 앱 메인 CSS에서 `@sirloinbh/design-tokens/tailwind.css`를 불러온다. Tailwind가 없는 앱은 `tokens.css`만 불러온다. 사용 예는 패키지 README에 있다.
- 색은 토큰 이름으로 쓴다: `bg-primary`, `text-muted-foreground`, `border-border`. 색 코드를 직접 쓰지 않는다.
- 테마 색 6개(`--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-ring`)만 앱 CSS에서 덮어쓴다. 값은 레지스트리의 앱별 테마 색(#122)에서 온다.
- 그 밖의 토큰(글꼴, 크기, 간격, 모서리, 그림자)은 앱에서 바꾸지 않는다. 바꿔야 하면 중앙 리포의 `design/tokens.json`을 고친다.

## 컴포넌트

1. 새 화면 요소는 `frontend/src/components/ui/`의 shadcn/ui 컴포넌트를 먼저 쓴다. 이 폴더는 중앙 관리 파일이다(#123).
2. 공통 컴포넌트에 없는 것이 필요하면 앱 고유 폴더(`frontend/src/components/`)에 만든다. 여러 앱에 필요해지면 중앙 리포에 이슈를 연다.
3. 레이아웃(상단 메뉴, LNB, footer, 모달, drawer, 메뉴)은 공통 레이아웃(#124)을 쓴다.

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

## 기존 앱 전환

workout-memo의 기존 토큰(`--color-ink` 등)이 새 토큰 중 무엇에 해당하는지는 [design-tokens.md](design-tokens.md)의 대응표에 있다. 전환은 #126에서 앱별로 한다.
