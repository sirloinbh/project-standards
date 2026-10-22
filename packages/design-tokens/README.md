# @sirloinbh/design-tokens

8개 앱이 함께 쓰는 디자인 토큰이다. 값의 원본은 중앙 리포의 `design/tokens.json`이고, 표는 `docs/design-tokens.md`에 있다. `tokens.css`와 `tailwind.css`는 자동 생성 파일이다.

## 쓰는 법

Tailwind CSS 4 앱 (`frontend/src/index.css`):

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@sirloinbh/design-tokens/tailwind.css';
```

Tailwind가 없는 앱은 `@sirloinbh/design-tokens/tokens.css`만 import하고 `var(--primary)`처럼 쓴다.

## 라이트·다크 모드

- 색은 8개 앱 모두 같은 흑백이다. 앱별 테마 색은 없다(ADR-0008).
- `<html class="dark">`이면 다크, `<html class="light">`이면 라이트다. 클래스가 없으면 시스템 설정(`prefers-color-scheme`)을 따른다.
- Tailwind의 `dark:` 유틸리티도 같은 조건으로 동작한다.

## 들어 있는 것

| 파일 | 내용 |
|---|---|
| `tokens.css` | `:root` CSS 변수(라이트 색, 글꼴, `--radius`, z-index, 움직임 시간, 레이아웃 여백, 터치 영역 크기), `.dark`와 시스템 다크 모드의 색, Pretendard `@font-face` |
| `tailwind.css` | `tokens.css` + `dark:` 변형 + Tailwind 테마(글자 크기, 기준점, 색, 모서리) + 기본 스타일(본문, h1–h4) + `text-body`·`text-body-sm`·`text-caption`·`text-meta` 유틸리티 |
| `fonts/` | Pretendard Variable woff2와 라이선스 |

토큰을 앱에서 덮어쓰지 않는다. 바꿔야 하면 중앙 리포의 `design/tokens.json`을 고친다.
