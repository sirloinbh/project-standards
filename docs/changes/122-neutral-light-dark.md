# #122 흑백 라이트·다크 모드로 색 통일하고 앱 표시 이름 정하기

## 결정

앱별 테마 색 8개를 제안했으나, 사용자가 "그냥 다 흰-검 다크모드, 화이트 모드로 통일"로 정했다(2026-10-22). 원래 요구사항 4-1(이름과 테마 색으로 구별)을 바꾸는 결정이라 [ADR-0008](../adr/0008-neutral-light-dark.md)로 기록했다.

## 변경

| 파일 | 내용 |
|---|---|
| `docs/adr/0008-neutral-light-dark.md` | 흑백 통일, 라이트·다크 모드, 앱은 표시 이름으로만 구별 |
| `design/tokens.json` | 앱별 테마 색 자리 6개를 공통 고정값으로 바꿨다. 다크 색 30개와 모드 규칙을 추가했다(shadcn/ui neutral 기준). 성공·주의 색도 다크용 값이 있다 |
| `scripts/build-tokens.mjs`, `packages/design-tokens/*.css` | 다크 색은 두 경우에 적용된다: `.dark` 클래스, 또는 `.light`가 없을 때 `prefers-color-scheme: dark`. `color-scheme` 지정, Tailwind `dark:` 변형도 같은 조건으로 정의 |
| `scripts/gen-docs.mjs`, `docs/design-tokens.md` | 색 표에 라이트·다크 두 열 |
| `registry/projects.json`·스키마, `scripts/lib/registry.mjs`, `docs/projects.md` | `displayName`(표시 이름). 중복이면 registry-check가 실패한다. workout-memo는 지금 쓰는 "FORM · 나의 운동 기록", 나머지는 `title`과 같다 |
| `docs/design-system.md`, 디자인 토큰 README·CHANGELOG | 테마 색 설명을 지우고 라이트·다크 모드 규칙을 추가했다 |
| `scripts/test/*` | 두 모드의 shadcn 색 이름, 대비, 표시 이름 중복, CSS 생성 결과 테스트 |

이슈 #124(공통 레이아웃)에 모드 전환 UI 할 일을 추가했다: 시스템 기본, 선택 저장, 첫 화면 깜빡임 방지.

## 검증

- `npm run check`: 테스트 119개 통과, 생성 파일 4개 최신, `package-guard: ok`, `check-workflows: ok (8 files)`
- **대비(WCAG, 두 모드 모두):** 기본 글자/배경, 카드, LNB는 7:1 이상(AAA)이다. 보조 글자, 주 버튼 글자, 보조 버튼 글자는 4.5:1 이상(AA)이다.
- **Tailwind 컴파일:** workout-memo에 설치된 Tailwind 4.3.3으로 컴파일해 확인했다(새 설치 없음).
  - `dark:bg-card`가 `.dark` 클래스 조건과 시스템 다크 모드(`:root:not(.light)`) 조건으로 모두 생성된다.
  - `.dark` 블록이 다크 배경색을 설정한다.
  - 기존 8개 확인 항목도 그대로 통과한다.
