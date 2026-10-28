# #311 삭제 확인 대화상자와 화면 안 알림 공통 컴포넌트

## 변경

| 파일 | 내용 |
|---|---|
| `templates/ui/frontend/src/components/ui/confirm-dialog.tsx`, `.test.tsx` | `ConfirmDialog`: 공통 `Dialog` 위에 제목·설명·확인·취소. 테스트 5개 |
| `templates/ui/frontend/src/components/ui/notice.tsx`, `.test.tsx` | `Notice`: `role="status"`·`"alert"`. 테스트 3개(훅 포함) |
| `templates/ui/frontend/src/lib/use-notice.ts` | `useNotice()`, `errorText()`, `NoticeValue` |
| `templates/app/.prettierignore.tmpl`, 스냅샷 | 새 관리 파일 |
| `docs/ui-components.md`, `docs/design.md` | 목록, 공통 도우미, 파일 분류 |

## 정한 것

- `ConfirmDialog`
  - 두 가지로 연다: `trigger`(버튼 하나에 대화상자 하나), 또는 `open`·`onOpenChange`(목록에서 고른 행 하나를 지울 때).
  - `onConfirm`이 Promise를 돌려주면 끝날 때까지 두 버튼을 막고 확인 버튼에 `Spinner`를 보인다. 성공하면 닫고, 실패하면 열어 둔다. 실패 문구는 화면이 `useNotice`로 보여 준다.
  - 처리하는 동안에는 Esc와 바깥 누르기로 닫히지 않는다.
  - 오른쪽 위 닫기 버튼은 뺐다. "취소"가 같은 일을 한다.
- `Notice`와 `useNotice`
  - 훅은 `lib/use-notice.ts`로 나눴다. 컴포넌트 파일이 컴포넌트만 내보내야 Vite 빠른 새로고침이 동작하기 때문이다(#244 `react-refresh` 규칙).
  - study-log의 `{ kind: 'status' | 'error', text }` 모양을 그대로 썼다. 오류는 `role="alert"`로 바로 읽히고, 진행·성공은 `role="status"`로 차례를 기다려 읽힌다.
  - `error(e)`는 던져진 값을 그대로 받는다. `RequestError`(#310)이면 서버의 한국어 문구가 보인다.
- 원시 `<button>`·`<input>`을 공통 컴포넌트로 바꾸는 일(#242 후보 H)은 하지 않았다.
- 템플릿 렌더러가 중괄호 두 개를 변수로 읽으므로, 테스트의 JSX 객체 값은 변수로 뺐다(`notice={saved}`).

## 앱에 들어간 뒤

| 앱 | 바꿀 것 |
|---|---|
| workout-memo | `confirm()` 3곳(`app.tsx` 2, `body.tsx` 1)을 `ConfirmDialog`로 |
| study-log | 화면마다 있는 `Notice` 타입·`role="status"`·`role="alert"` 문단(10개 화면)을 `useNotice`와 `<Notice>`로. 두 번 누르는 삭제 버튼은 `ConfirmDialog`로 바꿀지 화면을 보고 정한다 |

## 검증

- `notice.test.tsx`와 `api.test.ts`를 workout-memo에 설치된 Vitest 5.0.3·jsdom·Testing Library로 돌림(임시 폴더, 설치 없음): 7개 통과
- 같은 앱의 TypeScript 5.9.3으로 `notice.tsx`·`use-notice.ts`·테스트를 `strict`로 타입 검사: 오류 없음
- 같은 앱의 ESLint로 공유 설정 1.1.0을 적용해 새 파일 5개 검사: 위반 없음
- `confirm-dialog.tsx`와 그 테스트는 이 PC의 앱 체크아웃에 `radix-ui`가 설치돼 있지 않아 돌리지 못했다. 동기화 PR의 앱 CI(rollout 1 workout-memo부터)에서 처음 돈다. 테스트는 기존 `dialog.test.tsx`와 같은 방식(`fireEvent`, 역할·이름으로 찾기)으로 썼다.
- `npm run check` 결과는 PR에 적는다
