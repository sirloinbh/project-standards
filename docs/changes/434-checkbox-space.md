# #434 공통 Checkbox 누름 영역 클래스 사이 빠진 공백 복구

#415(PR #431)에서 `-inset-3.5`를 `-inset-[15px]`로 바꿀 때 뒤 클래스와의 공백이 빠졌다. 그래서 `pointer-coarse:after:-inset-[15px]pointer-coarse:after:content-['']`가 Tailwind에서 하나의 잘못된 클래스가 되어 44px 누름 영역이 적용되지 않았다.

## 찾은 경로

앱 8곳의 동기화 PR(project-standards@6b5d099)에서 `verify`가 모두 `checkbox.test.tsx`의 `touch screens get a 44px tap area around the 16px box`로 실패했다. 이 테스트는 앱 리포의 Vitest에서만 돌기 때문에 중앙 CI에서는 걸리지 않았다.

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/components/ui/checkbox.tsx` | 두 클래스 사이에 공백을 넣었다 |

## 검증

- 앱 동기화 PR이 이 커밋으로 갱신된 뒤 `verify`가 통과하는지 확인한다.
