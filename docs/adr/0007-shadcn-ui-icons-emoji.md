# 0007. UI 컴포넌트는 shadcn/ui, 아이콘은 lucide, 이모지는 Fluent Emoji Flat

- 상태: 채택 (이슈 #120)
- 날짜: 2026-10-22

## 맥락

- 8개 앱의 화면 구성 요소, 아이콘, 이모지를 각각 한 가지로 통일해야 한다.
- workout-memo는 이미 shadcn/ui 방식이다. 컴포넌트 소스를 리포에 직접 두고(`button`, `field`, `dialog`), `class-variance-authority`·`clsx`·`tailwind-merge`·`lucide-react`·Tailwind CSS 4를 쓴다. 나머지 7개 앱은 `lucide-react`만 있다.
- npm 공급망 공격 때문에 새 의존성은 고정 버전, 릴리스 후 14일 경과, `--ignore-scripts`, 사전 검증을 지켜야 한다.

## 결정

1. **UI 컴포넌트는 shadcn/ui로 통일한다.** 사용자가 후보 조사 없이 정했다(2026-10-22).
   - 컴포넌트 소스는 리포에 직접 둔다. 중앙 리포가 원본을 갖고, 각 앱의 `frontend/src/components/ui/`에 동기화한다(#123).
   - `npx shadcn` CLI는 쓰지 않는다. 임의 패키지를 내려받아 실행하므로 공급망 규칙에 맞지 않는다. 공식 문서의 소스를 보고 직접 작성한다.
2. **아이콘은 `lucide-react`로 통일한다.** shadcn/ui의 기본 아이콘이고 8개 앱이 이미 쓴다.
3. **이모지는 Microsoft Fluent Emoji의 Flat 스타일로 통일한다.** 사용자가 4개 후보 중 골랐다(2026-10-22).
   - npm 패키지를 쓰지 않는다. 공식 저장소 `microsoft/fluentui-emoji`의 커밋 `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`(2026-08-24)에서, 실제로 쓰는 SVG만 중앙 리포로 가져온다.
   - 라이선스(MIT) 고지 파일을 함께 둔다.
   - 저장소를 갱신할 때도 같은 14일 규칙을 적용한다.

## 의존성 표

조회일 2026-10-22, 기준일 2026-10-08(14일 전) 이전에 게시된 버전 중에서 골랐다. 모든 패키지에 `preinstall`·`install`·`postinstall`·`prepare` 스크립트가 없음을 `npm view`로 확인했다.

| 패키지 | 고정 버전 | 게시일 | 라이선스 | 저장소 | 의존성 수 | 비고 |
|---|---|---|---|---|---|---|
| `radix-ui` | 1.7.0 | 2026-10-05 | MIT | github.com/radix-ui/primitives | 55 (`@radix-ui/*`) | 최신 1.8.1(2026-10-12)은 14일 미경과 |
| `class-variance-authority` | 0.7.1 | 2024-11-26 | Apache-2.0 | github.com/joe-bell/cva | 1 | workout-memo와 같음 |
| `clsx` | 2.1.1 | 2024-04-23 | MIT | github.com/lukeed/clsx | 0 | workout-memo와 같음 |
| `tailwind-merge` | 3.7.0 | 2026-09-12 | MIT | github.com/dcastil/tailwind-merge | 0 | workout-memo와 같음 |
| `tw-animate-css` | 1.4.0 | 2025-09-24 | MIT | github.com/Wombosvideo/tw-animate-css | 0 | 애니메이션 유틸리티 |
| `sonner` | 2.0.8 | 2026-08-09 | MIT | github.com/emilkowalski/sonner | 0 | 토스트 |
| `vaul` | 1.1.2 | 2024-12-14 | MIT | github.com/emilkowalski/vaul | 1 | drawer |
| `lucide-react` | 0.468.0 | 2024 | ISC | github.com/lucide-icons/lucide | 0 | 지금 설치된 버전 유지. 최신 1.x는 메이저 업그레이드라 따로 검토 |
| `tailwindcss` | 4.3.3 | 2026-07-16 | MIT | github.com/tailwindlabs/tailwindcss | — | workout-memo와 같음 |
| `@tailwindcss/vite` | 4.3.3 | 2026-07-16 | MIT | github.com/tailwindlabs/tailwindcss | — | workout-memo와 같음 |

`radix-ui`는 하위 패키지 55개를 함께 설치한다. 이 패키지들도 lockfile에 고정되고, `--ignore-scripts`로 설치하며, `ioc-scan`(#76)이 점검한다.

## 아이콘·이모지 사용 규칙

- **아이콘:** `lucide-react` 컴포넌트를 쓴다.
  - 크기는 디자인 토큰의 아이콘 크기 단계(#121)를 따른다. 색은 글자 색을 그대로 물려받는다(`currentColor`).
  - 의미가 있는 아이콘 버튼에는 `aria-label`을 단다. 장식용 아이콘은 `aria-hidden`이다.
- **이모지:** 문자 이모지 대신 Fluent Emoji Flat SVG를 `<img>`로 쓴다. OS마다 모양이 달라지지 않게 하기 위해서다.
  - 크기는 글자 크기와 맞춘다. 색은 SVG에 들어 있는 색을 바꾸지 않는다.
  - 의미가 있으면 `alt`에 한국어 설명을 넣는다. 장식용이면 `alt=""`로 둔다.
- 다른 아이콘 세트, 다른 이모지 소스, 문자 이모지는 새로 도입하지 않는다.

## 결과

- 8개 앱이 같은 컴포넌트·아이콘·이모지를 쓰고, 앱 이름과 테마 색만 다르게 보인다.
- Tailwind와 공통 컴포넌트가 없는 7개 앱은 위 의존성을 새로 설치해야 한다. 사용자가 #126 범위의 설치를 사전 승인했다(조건: 이 표의 고정 버전, 14일 경과, `--ignore-scripts`).
- 표의 버전을 올릴 때는 이 ADR의 표를 갱신하는 PR을 먼저 연다.
