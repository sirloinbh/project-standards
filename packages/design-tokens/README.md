# @sirloinbh/design-tokens

8개 앱이 함께 쓰는 디자인 토큰이다. 값의 원본은 중앙 리포의 `design/tokens.json`이고, 표는 `docs/design-tokens.md`에 있다. `tokens.css`와 `tailwind.css`는 자동 생성 파일이다.

## 쓰는 법

Tailwind CSS 4 앱 (`frontend/src/index.css`):

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@sirloinbh/design-tokens/tailwind.css';

/* 앱 테마 색 6개 (값은 레지스트리 brand.themeColor에서, #122) */
:root {
  --primary: oklch(...);
  --primary-foreground: oklch(...);
  --ring: oklch(...);
  --sidebar-primary: oklch(...);
  --sidebar-primary-foreground: oklch(...);
  --sidebar-ring: oklch(...);
}
```

Tailwind가 없는 앱은 `@sirloinbh/design-tokens/tokens.css`만 import하고 `var(--primary)`처럼 쓴다.

## 들어 있는 것

| 파일 | 내용 |
|---|---|
| `tokens.css` | `:root` CSS 변수: 색, 글꼴, `--radius`, z-index, 움직임 시간, 레이아웃 여백(모바일·md·lg), 터치 영역 크기. Pretendard `@font-face` 포함 |
| `tailwind.css` | `tokens.css` + Tailwind 테마(글자 크기, 기준점, 색, 모서리) + 기본 스타일(본문, h1–h4) + `text-body`·`text-body-sm`·`text-caption`·`text-meta` 유틸리티 |
| `fonts/` | Pretendard Variable woff2와 라이선스 |

앱마다 다른 값은 테마 색 6개뿐이다. 그 밖의 토큰을 앱에서 덮어쓰지 않는다. 바꿔야 하면 중앙 리포의 `design/tokens.json`을 고친다.
