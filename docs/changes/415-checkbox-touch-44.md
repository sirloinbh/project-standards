# #415 공통 Checkbox 터치 누름 영역을 44px로 맞추기

sirloinbh/workout-memo#231의 실제 브라우저 터치 e2e(`::after` 크기 측정)에서 찾았다. `Checkbox`의 `::after`는 `position: absolute`라 1px 테두리 안쪽(padding box)을 기준으로 잡힌다. 그래서 `-inset-3.5`(14px)는 (16 − 2) + 14 × 2 = 42px였다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/components/ui/checkbox.tsx` | `pointer-coarse:after:-inset-3.5`를 `pointer-coarse:after:-inset-[15px]`로 바꿨다. (16 − 2) + 15 × 2 = 44px. 계산을 주석에 적었다 |
| `templates/ui/frontend/src/components/ui/checkbox.test.tsx` | 상자 `size-4`·`border`와 15px 누름 영역 클래스를 확인한다 |

## 다른 공통 컴포넌트

- `::after`로 누름 영역을 넓히는 컴포넌트는 `Checkbox`뿐이다. Radio 컴포넌트는 없다.
- `Button`, `Input`, `Select`, `DropdownMenu`, `Dialog`·`Sheet` 닫기 버튼, `AppShell` 메뉴는 `pointer-coarse:min-h-11`·`size-11`로 요소 자체 크기를 키운다. `box-sizing: border-box`라 테두리가 크기 안에 들어가므로 44px 그대로다.

## 앱에서 할 일

- 동기화 PR이 병합되면, 앱에서 `Checkbox`에 `className`으로 덮어쓴 누름 영역(예: sirloinbh/workout-memo `097559e`)을 지워도 된다. 지우는 일은 각 앱 리포에서 한다.

## 검증

- 실제 브라우저 측정(headless Chrome): Tailwind가 만드는 것과 같은 CSS로 1px 테두리 16px 상자를 그리고 `getComputedStyle(el, '::after')`로 쟀다.
  - 이전(`inset: calc(var(--spacing) * -3.5)`): 상자 16×16, 누름 영역 42×42px
  - 이후(`inset: -15px`): 상자 16×16, 누름 영역 44×44px
- `checkbox.test.tsx`는 앱 리포의 Vitest에서 돈다. 이 리포에는 패키지를 설치하지 않으므로 여기서는 실행하지 못했다.
- `npm run check`: 통과(테스트 523개 중 518 통과, 0 실패, 5 건너뜀).
