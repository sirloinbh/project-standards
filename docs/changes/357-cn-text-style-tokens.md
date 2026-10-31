# #357 cn()이 글자 크기 토큰을 색상으로 착각하는 문제 수정

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/lib/utils.ts`, `scaffold/app/frontend/src/lib/utils.ts` | `cn()`을 `extendTailwindMerge`로 바꾸고 글자 스타일 토큰 4개를 글자 크기 무리에 등록 |
| `templates/ui/frontend/src/lib/utils.test.ts`, `templates/app/.prettierignore.tmpl` | 앱에서 돌아가는 동작 테스트와 관리 파일 목록 |
| `scripts/test/cn-text-styles.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | 토큰 목록 일치 검사, 동기화 파일 목록 |

## 정한 것

- 토큰 이름은 `utils.ts`의 한곳에 두고, 중앙 테스트가 `packages/design-tokens/tailwind.css`의 `@utility text-*`와 비교한다. 토큰이 늘면 이 테스트가 실패한다.
- 앱에 새 패키지가 필요 없다. `tailwind-merge`는 이미 공통 의존성이다.

## 확인

- 중앙에는 `tailwind-merge`가 없어, cert-manager의 `node_modules`에 있는 3.7.0으로 실제 `utils.ts`를 실행해 결과를 확인했다.
- `text-body-sm`은 색도 지정하지만, Tailwind는 선언이 적은 유틸리티를 뒤에 두므로 `text-destructive`의 색이 적용되는 것으로 판단했다. 화면 확인은 동기화 뒤에 한다.

## 영향

- `className`에 글자 색을 준 공통 컴포넌트의 글자가 원래 크기로 돌아온다. 화면이 달라질 수 있어 앱 CI의 시각 비교 결과를 동기화 PR에서 확인한다.
